# Prompt Builder V7 — Architecture, Deployment and Maintenance Report

## 1. Project overview

We developed and deployed Prompt Builder V7, a web application integrated with Notion.

The objective is to provide a structured interface for creating high-quality AI prompts using predefined engineering roles, patterns, deliverables, answer sizes and answer formats.

Instead of manually maintaining prompt templates inside the HTML, the application retrieves its configuration dynamically from Notion.

The result is a standalone web application that can also be accessed directly from a Notion page.

### Main achievements

- Developed a standalone HTML-based prompt builder.
- Connected the application to five Notion libraries.
- Implemented a Cloudflare Worker API to communicate with Notion.
- Configured secure storage of the Notion integration secret.
- Deployed the frontend on Cloudflare.
- Embedded the working Cloudflare application inside Notion.
- Tested the application end to end, including prompt generation and copying.

## 2. System architecture

The architecture consists of three main components:

1. Notion: data management and configuration.
2. Cloudflare: application hosting and backend API.
3. Browser: application execution and user interaction.

### 2.1 Architecture diagram

```
                    USER
                     |
                     v
             NOTION WORKSPACE
                     |
                Embedded App
                     |
                     v
          CLOUDFLARE FRONTEND
          (Static HTML / JavaScript)
                     |
                     | HTTPS fetch
                     v
          CLOUDFLARE WORKER API
          prompt-builder-api
                     |
                     | Notion API
                     v
               NOTION API
                     |
                     v
             NOTION DATABASES
                     |
          +----------+----------+
          |          |          |
         Roles    Patterns  Deliverables
          |
          +---- Answer Size
          |
          +---- Answer Format
```

### 2.2 Notion — data layer

Notion acts as the source of truth for the prompt libraries.

The five libraries are:

| Library | Purpose |
| --- | --- |
| Roles | Defines the AI assistant's role |
| Patterns / Context | Defines the working context or methodology |
| Deliverables | Defines the expected output |
| Answer Size | Controls response length |
| Answer Format | Defines formatting requirements |

The application retrieves these libraries through the backend API.

This means new library entries can be managed in Notion without editing the frontend HTML, provided the existing database structure and API implementation support them.

### 2.3 Cloudflare Worker — backend API

The backend service is deployed as a Cloudflare Worker.

Its responsibility is to act as an intermediary between the frontend and Notion.

The application calls:

`https://prompt-builder-api.federicozanetti92.workers.dev/options`

The Worker:

1. Receives the frontend request.
2. Uses the Notion API credentials stored in its environment.
3. Queries the relevant Notion data sources.
4. Returns the library information as JSON.
5. Handles cross-origin resource sharing (CORS) for the frontend.

The Notion integration secret is stored in Cloudflare as a secret binding:

`Notion-Secret-for-Engineering-AI-Playbook`

The secret is not embedded in the frontend HTML.

This is important because frontend JavaScript is visible to users. Private API credentials must remain on the backend.

### 2.4 Cloudflare frontend — application hosting

The frontend is deployed separately from the backend.

Cloudflare serves the HTML and JavaScript files to the browser.

Current application URL:

https://curly-silence-21d9.federicozanetti92.workers.dev/index.html

The application:

- Loads the five Notion libraries.
- Displays the available options.
- Allows users to enter custom values.
- Combines the selected values into a prompt.
- Updates the generated prompt dynamically.
- Supports copying and downloading the generated prompt.

The frontend and backend are separate deployments. Updating the HTML does not normally require redeploying the API Worker.

## 3. Cloudflare — technology overview

Cloudflare is a global cloud infrastructure and application platform.

It originally became widely known for content delivery network (CDN) services, domain name system (DNS) services, web security and distributed traffic management.

Its platform has evolved to support application hosting, serverless computing, storage, databases and application development.

### 3.1 Technologies used in this project

| Cloudflare technology | Function in our project |
| --- | --- |
| Workers | Executes the backend API |
| Workers static assets / upload deployment | Hosts the frontend files |
| Workers secrets | Stores the Notion API credential |
| workers.dev | Provides an application URL |
| Cloudflare global network | Distributes and executes services across its network |

A Cloudflare Worker runs JavaScript or WebAssembly in a serverless execution environment.

Unlike a conventional server, we do not need to provision or maintain a virtual machine for this API.

Cloudflare manages the underlying execution infrastructure.

### 3.2 What does serverless mean?

Serverless does not mean that there are no servers.

It means that the cloud provider manages the infrastructure.

The developer focuses on application code rather than:

- Operating system installation.
- Server provisioning.
- Operating system updates.
- Infrastructure scaling.
- Server availability management.

This is particularly useful for small APIs and lightweight web applications.

## 4. Cloudflare compared with AWS

Cloudflare and Amazon Web Services (AWS) offer overlapping cloud capabilities, but their architectures and product ecosystems are different.

AWS provides a broad infrastructure and platform ecosystem. Cloudflare focuses strongly on its global network, edge computing, application delivery and security.

### 4.1 Equivalent technologies

| Our Cloudflare component | AWS equivalent | Purpose |
| --- | --- | --- |
| Cloudflare Workers | AWS Lambda | Serverless backend execution |
| Workers static assets | Amazon S3 + CloudFront | Static frontend hosting and delivery |
| Workers secrets | AWS Secrets Manager | Secure credential storage |
| workers.dev | AWS-provided service endpoints / custom domain | Application access |
| Cloudflare global network | AWS global infrastructure | Distributed application delivery |

These are functional equivalents, not exact architectural matches.

For example, Cloudflare Workers and AWS Lambda both execute serverless code, but they have different execution environments, runtime constraints, integration models and deployment workflows.

### 4.2 How the same project could be implemented on AWS

The architecture could be reproduced using AWS services:

```
                 USER
                   |
                   v
              NOTION PAGE
                   |
                   v
             AWS CLOUDFRONT
                   |
                   v
              AWS S3
             index.html
                   |
                   v
             AWS API GATEWAY
                   |
                   v
             AWS LAMBDA
                   |
                   v
          AWS SECRETS MANAGER
                   |
                   v
               NOTION API
```

Possible implementation:

1. Store the frontend HTML in Amazon S3.
2. Distribute the frontend using Amazon CloudFront.
3. Expose an API through Amazon API Gateway.
4. Execute the backend using AWS Lambda.
5. Store the Notion integration secret in AWS Secrets Manager.
6. Configure CORS between the frontend and backend.

This would achieve essentially the same functional result.

### 4.3 Cloudflare versus AWS — practical comparison

| Characteristic | Cloudflare | AWS |
| --- | --- | --- |
| Main strength | Global edge network and lightweight application services | Broad cloud infrastructure ecosystem |
| Serverless computing | Workers | Lambda |
| Static hosting | Workers static assets | S3 + CloudFront |
| Backend APIs | Workers | API Gateway + Lambda |
| Secrets management | Workers secrets | Secrets Manager |
| Infrastructure complexity | Often lower for small applications | More configuration choices |
| Ecosystem | Focused cloud and edge platform | Extensive services and integrations |
| Enterprise infrastructure | Strong | Very extensive |

### 4.4 Why Cloudflare was a good choice here

For this particular project, Cloudflare is a sensible solution because:

- The frontend is a relatively small static application.
- The backend performs lightweight API requests.
- There is no requirement for a continuously running server.
- The application does not require complex database infrastructure.
- Deployment is straightforward through file uploads.
- The backend and frontend can be maintained independently.

AWS would also be a valid choice, especially if the application eventually became part of a larger AWS-based enterprise architecture.

However, migrating this working application to AWS would introduce additional configuration and infrastructure without providing an immediate functional advantage.

**Recommendation:** keep the current Cloudflare architecture until there is a concrete technical or organizational reason to migrate.

## 5. Important technical considerations

### 5.1 Notion Content Security Policy

During development, the application initially failed when its HTML was embedded directly inside Notion.

The browser reported a Content Security Policy (CSP) violation involving the connection to the Cloudflare API.

This was not fundamentally a Notion API authentication problem.

The issue was caused by restrictions imposed by the environment in which the original embedded HTML was executing.

We solved this by deploying the application independently on Cloudflare and embedding the Cloudflare-hosted URL in Notion.

The important distinction is:

- Original approach: HTML executes inside Notion's embedded environment.
- Working approach: HTML is served independently by Cloudflare and accessed through Notion.

This avoids the original execution restriction.

### 5.2 Frontend and backend independence

The architecture separates the user interface from the backend.

This provides several advantages:

- Frontend changes do not require backend changes.
- Notion library updates do not normally require frontend redeployment.
- API credentials remain outside the frontend.
- The backend can be maintained independently.

### 5.3 Data refresh

The frontend retrieves the Notion libraries when the application loads.

After adding or updating a Notion entry:

1. Save the change in Notion.
2. Reload the Prompt Builder.
3. Check the corresponding dropdown.

This assumes the Worker continues to query the relevant Notion data sources dynamically and does not serve stale cached responses.

## 6. How to update the HTML

This section describes the normal procedure for updating the frontend without changing the backend.

### 6.1 Current deployment information

| Item | Value |
| --- | --- |
| Cloudflare frontend project | curly-silence-21d9 |
| Frontend URL | https://curly-silence-21d9.federicozanetti92.workers.dev/index.html |
| Backend Worker | prompt-builder-api |
| Backend API endpoint | https://prompt-builder-api.federicozanetti92.workers.dev/options |
| Main HTML filename | index.html |
| Deployment method | Upload and deploy |

### 6.2 Update procedure

**Step 1 — Prepare the new HTML**

Make the required changes to the local HTML file.

Keep its filename exactly:

`index.html`

Do not rename it to `prompt-builder-v7.html`.

**Step 2 — Check the API endpoint**

Before uploading, verify that the HTML still references:

```
https://prompt-builder-api.federicozanetti92.workers.dev/options
```

Do not remove or modify the API integration unless the backend is intentionally being changed.

**Step 3 — Prepare the deployment folder**

Create a folder with this exact structure:

```
prompt-builder/
    |
    +-- index.html
```

For the current simple deployment, include only the HTML file.

Do not add:

- `_redirects`
- Additional folders
- Old HTML versions
- Unrelated files

**Step 4 — Open Cloudflare**

Access the Cloudflare dashboard and open the frontend project:

`curly-silence-21d9`

Dashboard:

https://dash.cloudflare.com/dd01395586512ca5caa375d9f520f542/workers/services/view/curly-silence-21d9/production

**Step 5 — Upload and deploy**

Use the upload deployment workflow.

Upload the prepared `prompt-builder` folder using the same deployment method used for the working version.

Cloudflare automatically creates a new deployment.

Important: uploading a new deployment may replace the previous set of static files. Always include the required `index.html` in the upload.

**Step 6 — Verify the deployment**

Open:

https://curly-silence-21d9.federicozanetti92.workers.dev/index.html

Check the following:

- The application loads.
- The Notion connection succeeds.
- All five libraries appear.
- The dropdowns work.
- Generated prompts update automatically.
- Copy and download functions work.

The expected library counts at the time of the original successful deployment were:

| Library | Expected entries |
| --- | --- |
| Roles | 14 |
| Patterns | 37 |
| Deliverables | 11 |
| Answer Size | 5 |
| Answer Format | 3 |

These counts may change as the Notion databases evolve.

**Step 7 — Verify the Notion embed**

Finally, open the Notion page containing the Cloudflare embed.

Reload the page and check that the updated frontend is visible and functional.

### 6.3 What should not be changed during a frontend update

Unless there is a specific requirement, do not modify:

- The `prompt-builder-api` Worker.
- The Notion integration secret.
- The Notion database identifiers.
- The Notion integration permissions.
- The API endpoint in the HTML.
- The existing Cloudflare frontend project.

A frontend update should normally require only editing and redeploying `index.html`.

## 7. Final architecture summary

The current solution follows a simple separation of responsibilities:

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Data | Notion | Stores prompt libraries |
| Backend | Cloudflare Workers | Communicates with Notion |
| Security | Cloudflare secrets | Protects integration credentials |
| Frontend | HTML + JavaScript | Generates prompts |
| Hosting | Cloudflare | Serves the application |
| Access | Notion Embed | Provides convenient access |

The architecture is lightweight, modular and relatively easy to maintain.

It also demonstrates several useful software engineering concepts:

- Separation of concerns.
- Client-server architecture.
- Serverless computing.
- REST API integration.
- Secure credential management.
- Dynamic configuration.
- Static frontend deployment.
- Cross-origin resource sharing.
- Independent frontend and backend deployment.

**Final recommendation:** preserve the current working deployment as the baseline. Use Notion to manage prompt libraries, Cloudflare to host and execute the application, and update the frontend only when new functionality or improvements are required.

## 8. Recent update — Usage tracking and popularity-based Pattern ordering (18 November 2026)

The Prompt Builder now tracks how frequently each Task interrogation/Context (Pattern) entry is used and automatically prioritizes frequently used entries in the Pattern dropdown.

### 8.1 Behaviour

- The trigger is the **Copy prompt** action.
- When a valid Pattern is selected, the frontend sends its Notion page ID to the backend. The page ID is used as the stable identifier; the Pattern name or dropdown position is not used as identity.
- The backend increments that Pattern's numeric `Usage` property in Notion by 1.
- After the increment, the frontend reloads the Pattern options and sorts them by `Usage` descending (highest usage first).
- Patterns with equal Usage values are ordered alphabetically as a tie-breaker.
- The currently selected Pattern is preserved after the dropdown refresh.
- If no valid Pattern is selected, no Usage increment is requested.
- The prompt is still copied if the Usage update or dropdown refresh fails; the frontend reports a warning instead of blocking the copy operation.

### 8.2 Backend API changes

The existing options endpoint remains:

`GET https://prompt-builder-api.federicozanetti92.workers.dev/options`

The Worker now also exposes:

`POST https://prompt-builder-api.federicozanetti92.workers.dev/increment-usage`

The request identifies the selected Pattern by its Notion page ID. The Worker validates the ID and verifies that the page belongs to the Patterns data source before updating its Usage property through the Notion API.

The `/options` response now includes the Usage value for Pattern entries. Pattern ordering is also applied in the frontend so the dropdown reflects the latest values after refresh.

### 8.3 Notion integration permissions

In addition to reading content, the Notion integration must have **Update content** capability enabled. Read access alone allows the five libraries and Usage values to be retrieved, but does not authorize the page update.

The integration secret remains stored in the Cloudflare Worker secret binding:

`Notion-Secret-for-Engineering-AI-Playbook`

No secret is placed in the frontend. The same integration and secret are used; enabling the required capability does not require exposing or copying the token into the HTML.

### 8.4 Deployment sequence for this feature

The feature required updates to both independently deployed components:

1. Deploy the updated `prompt-builder-api` Worker containing Usage retrieval and the `POST /increment-usage` endpoint.
2. Confirm that `/options` returns Usage values for Patterns.
3. Enable **Update content** for the Notion integration.
4. Update the local frontend `index.html` with the Copy prompt increment and refresh logic.
5. Test the local HTML against the deployed Worker and confirm that the selected Pattern's Usage value changes in Notion.
6. Upload and deploy the updated `index.html` to the existing Cloudflare frontend project `curly-silence-21d9`.
7. Open the Notion-embedded application and repeat the test in the live deployment.

The live Notion-embedded application was tested successfully: clicking Copy prompt incremented the selected Pattern's Usage value in the Notion database. The frontend deployment was also completed and verified.

### 8.5 Maintenance notes

- To maintain this feature, keep the Notion Pattern database's `Usage` property numeric and available to the integration.
- If Usage updates fail with a Notion permissions error, check that **Update content** is enabled for the correct integration and that the integration remains connected to the Pattern data source.
- If the backend logic changes, deploy the backend Worker. If the frontend logic or interface changes, deploy the frontend `index.html`. Changes to both layers require both deployments.
- The other four libraries (Roles, Deliverables, Answer Size and Answer Format) retain their existing ordering and behaviour; Usage-based ordering applies only to the Pattern dropdown.

### 8.6 Updated stable baseline

As of 18 November 2026, the confirmed working baseline includes the original five-library prompt generation flow plus Pattern Usage tracking, automatic Usage-based dropdown ordering, and retention of the selected Pattern after refresh. Both the backend Worker and the frontend HTML are deployed on Cloudflare, and the live Notion embed has passed the Usage increment test.