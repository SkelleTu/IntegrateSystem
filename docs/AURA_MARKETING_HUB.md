# Aura System — Central de Marketing IA

The Marketing Hub is an isolated, tenant-scoped module exposed at `/marketing`.

## Areas
- Opportunities and market research
- Products and profitability
- Brands and campaigns
- Content and audience
- Leads and sales
- Agent catalog and automations
- Integration readiness

## Persistence and access
Marketing records are stored in the PostgreSQL table `aura_marketing_records`, partitioned logically by `enterprise_id`. Every read, update, and delete includes the authenticated user's enterprise ID. The server creates the table and indexes on first use.

## API
- `GET /api/marketing/overview`
- `GET /api/marketing/records?type=<record-type>`
- `POST /api/marketing/records`
- `PATCH /api/marketing/records/:id`
- `DELETE /api/marketing/records/:id`

Supported record types: opportunity, product, brand, campaign, content, audience, lead, agent, automation.

## External services
Kernel, Supermetrics, n8n, Supabase, Canva, Metricool and Postiz are displayed as pending until production credentials, authorization and service endpoints are configured. No API secrets are stored in marketing records. Social actions must respect each platform's official permissions and policies.
