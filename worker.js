

const NOTION_VERSION = "2025-09-03";

const DATA_SOURCES = {
  roles: {
    id: "41bf948e-f091-8109-a90a-000b009ed778",
    title: "Role",
  },
  patterns: {
    id: "3da6e0ee-d5d0-4d24-aacf-459c5be0ba24",
    title: "Pattern",
  },
  deliverables: {
    id: "41bf948e-f091-814f-a845-000bfb395f69",
    title: "Deliverable",
  },
  answerSize: {
    id: "d5ef948e-f091-8291-b66c-070d19000a4b",
    title: "Size name",
  },
  answerFormat: {
    id: "0d6f948e-f091-8215-a4a4-077b4c483689",
    title: "Size name",
  },
};

const TRACKED_LIBRARIES = ["roles", "patterns", "deliverables"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

function readProperty(property) {
  if (!property) return null;

  switch (property.type) {
    case "title":
    case "rich_text":
      return (property[property.type] || [])
        .map(item => item.plain_text || item.text?.content || "")
        .join("");

    case "select":
      return property.select?.name || null;

    case "multi_select":
      return (property.multi_select || []).map(item => item.name);

    case "checkbox":
      return property.checkbox;

    case "number":
      return property.number;

    case "url":
      return property.url;

    case "email":
      return property.email;

    case "phone_number":
      return property.phone_number;

    default:
      return null;
  }
}

function normalizePage(page, config, library) {
  const properties = page.properties || {};

  const result = {
    id: page.id,
    name: readProperty(properties[config.title]),
    url: page.url,
  };

  if (TRACKED_LIBRARIES.includes(library)) {
    result.usage = readProperty(properties["Usage"]) ?? 0;
  }

  if (library === "roles") {
    result.category = readProperty(properties["Category"]);
    result.description = readProperty(properties["Description"]);
  }

  if (library === "patterns") {
    result.interrogation = readProperty(properties["Interrogation"]);
    result.moment = readProperty(properties["Moment"]);
    result.domains = readProperty(properties["Domains"]);
    result.notes = readProperty(properties["Notes"]);
  }

  if (library === "deliverables") {
    result.description = readProperty(properties["Description"]);
    result.purpose = readProperty(properties["Purpose"]);
  }

  if (library === "answerSize" || library === "answerFormat") {
    result.description = readProperty(properties["Description"]);
  }

  return result;
}

function sortByUsage(items) {
  return items.sort((a, b) =>
    (Number(b.usage || 0) - Number(a.usage || 0)) ||
    a.name.localeCompare(b.name)
  );
}

async function notionRequest(url, token, body, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || `Notion API error: ${response.status}`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

async function queryDataSource(id, token) {
  const url = `https://api.notion.com/v1/data_sources/${id}/query`;

  let results = [];
  let cursor;

  do {
    const body = { page_size: 100 };

    if (cursor) body.start_cursor = cursor;

    let data;
    let attempt = 0;

    while (true) {
      try {
        data = await notionRequest(url, token, body);
        break;
      } catch (error) {
        attempt++;

        if (
          attempt >= 4 ||
          (error.status !== 429 && error.status < 500)
        ) {
          throw error;
        }

        await new Promise(resolve =>
          setTimeout(resolve, 1000 * attempt)
        );
      }
    }

    results = results.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function incrementUsage(pageId, library, token) {
  if (!TRACKED_LIBRARIES.includes(library)) {
    const error = new Error(
      "Invalid library. Allowed values: roles, patterns, deliverables."
    );
    error.status = 400;
    throw error;
  }

  const config = DATA_SOURCES[library];
  const pages = await queryDataSource(config.id, token);
  const page = pages.find(item => item.id === pageId);

  if (!page) {
    const error = new Error(
      `The selected entry was not found in the ${library} library.`
    );
    error.status = 404;
    throw error;
  }

  const usageProperty = page.properties?.["Usage"];

  if (!usageProperty || usageProperty.type !== "number") {
    const error = new Error(
      `The ${library} library entry "${readProperty(page.properties?.[config.title]) || pageId}" must have a Notion number property named "Usage".`
    );
    error.status = 400;
    throw error;
  }

  const currentUsage = usageProperty.number ?? 0;

  if (
    typeof currentUsage !== "number" ||
    !Number.isFinite(currentUsage)
  ) {
    const error = new Error(
      `The Usage property for this ${library} entry is not a valid number.`
    );
    error.status = 400;
    throw error;
  }

  const newUsage = currentUsage + 1;

  const updatedPage = await notionRequest(
    `https://api.notion.com/v1/pages/${pageId}`,
    token,
    {
      properties: {
        Usage: {
          number: newUsage,
        },
      },
    },
    "PATCH"
  );

  return {
    pageId: updatedPage.id,
    library,
    name: readProperty(updatedPage.properties?.[config.title]),
    usage: readProperty(updatedPage.properties?.["Usage"]),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (url.pathname === "/health") {
      return jsonResponse({
        status: "ok",
        service: "prompt-builder-api",
        version: "1.2.0",
      });
    }

    const token =
      env["Notion-Secret-for-Engineering-AI-Playbook"];

    if (!token) {
      return jsonResponse(
        { success: false, error: "Notion secret not found." },
        500
      );
    }

    if (url.pathname === "/increment-usage") {
      if (request.method !== "POST") {
        return jsonResponse(
          { success: false, error: "Method not allowed." },
          405
        );
      }

      try {
        const body = await request.json();
        const pageId = body.pageId;
        const library = body.library || "patterns";

        if (
          typeof pageId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId)
        ) {
          return jsonResponse(
            { success: false, error: "Invalid Notion page ID." },
            400
          );
        }

        const result = await incrementUsage(
          pageId,
          library,
          token
        );

        return jsonResponse({
          success: true,
          message: `${library} usage incremented.`,
          result,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: error.message,
            status: error.status || 500,
          },
          error.status || 500
        );
      }
    }

    if (url.pathname === "/options") {
      if (request.method !== "GET") {
        return jsonResponse(
          { success: false, error: "Method not allowed." },
          405
        );
      }

      try {
        const options = {};

        // Read the five libraries sequentially to reduce
        // the risk of Notion API rate limits.
        for (const [library, config] of
          Object.entries(DATA_SOURCES)) {
          const pages = await queryDataSource(
            config.id,
            token
          );

          options[library] = pages
            .map(page => normalizePage(page, config, library))
            .filter(item => item.name);
        }

        // Sort all three tracked libraries by Usage descending.
        // Alphabetical order breaks ties.
        for (const library of TRACKED_LIBRARIES) {
          sortByUsage(options[library]);
        }

        return jsonResponse({
          service: "prompt-builder-api",
          version: "1.2.0",
          success: true,
          fetchedAt: new Date().toISOString(),
          options,
        });
      } catch (error) {
        return jsonResponse(
          {
            service: "prompt-builder-api",
            success: false,
            error: error.message,
            status: error.status || 500,
          },
          502
        );
      }
    }

    return jsonResponse({
      service: "prompt-builder-api",
      version: "1.2.0",
      endpoints: [
        "/health",
        "/options",
        "/increment-usage",
      ],
    });
  },
};