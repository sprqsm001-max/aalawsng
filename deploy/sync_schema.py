import os

backend_schema = os.path.join(os.path.dirname(__file__), "..", "backend", "prisma", "schema.prisma")
deploy_schema = os.path.join(os.path.dirname(__file__), "schema.postgresql.prisma")

with open(backend_schema, "r", encoding="utf-8") as f:
    content = f.read()

pg_content = content.replace('provider = "sqlite"', 'provider = "postgresql"')

with open(deploy_schema, "w", encoding="utf-8") as f:
    f.write(pg_content)

print("SUCCESS: deploy/schema.postgresql.prisma updated successfully!")
