Mini README — Mock → Postgres backend

1) Instalación

```bash
cd backend
npm install
```

2) Configurar variables de entorno

Copia `.env.example` a `.env` y ajusta `DATABASE_URL` y `JWT_SECRET`.

3) Migraciones

- Hay scripts SQL en `sql/` (por ejemplo `sql/schema_completo.sql`).
- Puedes aplicar esas sentencias en tu Postgres (psql) o usar una herramienta de migraciones (recomiendo `node-pg-migrate` o `knex`).
 
Ejecutar el schema desde Node (usa `.env` con `DATABASE_URL`):

```bash
cd backend
node scripts/init-db.js
```

Esto ejecutará `sql/schema_completo.sql` contra la base de datos configurada.

4) Ejecutar

```bash
npm start
# o en desarrollo
npm run dev
```

5) Notas

- Conecta la app Expo ajustando `EXPO_PUBLIC_API_URL=http://localhost:4000`.
- Próximos pasos: implementar hashing de contraseñas (bcrypt), endpoints de auth/usuarios, migraciones y Docker Compose para Postgres.
