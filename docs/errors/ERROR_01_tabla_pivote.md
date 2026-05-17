# Documentación de Error — Relación tasks ↔ users

> **Proyecto:** TaskApp SENA  
> **Módulo afectado:** Base de datos + Backend (tasks.controller.js + users.controller.js)  
> **Severidad:** Alta  
> **Estado:** ✅ Resuelto

---

## Descripción del error

La relación entre las tablas `tasks` y `users` estaba modelada como **uno a muchos**
cuando debía ser **muchos a muchos**.

La tabla `tasks` tenía un campo `userId` como clave foránea directa, lo que significaba
que una tarea solo podía pertenecer a un único usuario. Para asignar la misma tarea a
varios estudiantes, el sistema creaba una fila duplicada en `tasks` por cada uno,
repitiendo el mismo título y descripción tantas veces como estudiantes hubiera.

Adicionalmente, el campo `status` vivía dentro de `tasks`, lo que hacía imposible que
dos estudiantes tuvieran estados de progreso distintos para la misma tarea.

---

## Estado anterior — Modelo incorrecto

### Tabla `tasks` (antes)

```sql
CREATE TABLE tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      ENUM('pendiente', 'en progreso', 'completada', 'incompleta')
                NOT NULL DEFAULT 'pendiente',
    userId      INT NOT NULL,                          -- ❌ FK directa a users
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### Consecuencia en los datos

| id | title          | description    | status    | userId |
|----|----------------|----------------|-----------|--------|
| 1  | Tarea HTML     | Hacer una web  | pendiente | 3      |
| 2  | Tarea HTML     | Hacer una web  | pendiente | 4      |
| 3  | Tarea HTML     | Hacer una web  | pendiente | 5      |

> La misma tarea se duplicaba 3 veces — una por cada estudiante.  
> Si el instructor corregía el título, había que actualizarlo en 3 filas.

### Controlador `createTask` (antes)

```javascript
// ❌ Creaba una fila en tasks por cada estudiante del array
if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    for (const uid of userIds) {
        await pool.query(
            'INSERT INTO tasks (title, description, userId) VALUES (?, ?, ?)',
            [title, description || null, uid]
        );
        tareasCreadas++;
    }
}
```

### Controlador `patchTaskStatus` (antes)

```javascript
// ❌ Actualizaba el status por ID de tarea, sin saber qué estudiante lo hacía
const [result] = await pool.query(
    'UPDATE tasks SET status = ? WHERE id = ?',
    [status, req.params.id]
);
```

### Controlador `getTasksByUser` (antes)

```javascript
// ❌ Buscaba tareas por userId directo en la tabla tasks
const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE userId = ?', [req.params.userId]
);
```

---

## Problema identificado

| # | Problema |
|---|---|
| 1 | Relación uno a muchos cuando la lógica del negocio exige muchos a muchos |
| 2 | Duplicación de datos: título y descripción repetidos por cada estudiante asignado |
| 3 | El `status` era global para la tarea — no podía ser distinto por estudiante |
| 4 | Si el instructor editaba el título, debía actualizarse en múltiples filas |
| 5 | No había forma de saber cuántos estudiantes tenía asignada una tarea sin contar duplicados |

---

## Solución aplicada

Se introdujo la tabla pivote `user_tasks` que implementa correctamente la relación
muchos a muchos entre `tasks` y `users`.

### Nuevo modelo de datos

```
tasks (1) ────────── (N) user_tasks (N) ────────── (1) users
  id                      task_id  ← FK                id
  title                   user_id  ← FK                name
  description             status                        email
  createdAt               createdAt                     ...
```

### Tabla `tasks` (después)

```sql
-- ✅ tasks solo guarda datos propios de la tarea
CREATE TABLE tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- userId y status eliminados
);
```

### Tabla `user_tasks` (nueva)

```sql
-- ✅ Cada fila = una asignación con su propio estado independiente
CREATE TABLE user_tasks (
    task_id   INT NOT NULL,
    user_id   INT NOT NULL,
    status    ENUM('pendiente', 'en progreso', 'completada', 'incompleta')
              NOT NULL DEFAULT 'pendiente',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),                          -- PK compuesta
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Consecuencia en los datos (después)

**Tabla `tasks`:**

| id | title      | description   | createdAt  |
|----|------------|---------------|------------|
| 1  | Tarea HTML | Hacer una web | 2025-01-01 |

**Tabla `user_tasks`:**

| task_id | user_id | status      |
|---------|---------|-------------|
| 1       | 3       | pendiente   |
| 1       | 4       | en progreso |
| 1       | 5       | completada  |

> Una sola fila en `tasks`. Cada estudiante tiene su propio estado.  
> Juan no ha empezado, María está en progreso y Carlos ya terminó.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `db_script.sql` | Elimina `userId` y `status` de `tasks`. Agrega tabla `user_tasks` |
| `src/controllers/tasks.controller.js` | Reescribe todas las queries para usar `user_tasks` con JOIN |
| `src/controllers/users.controller.js` | Reescribe `getUserTasks` para usar JOIN con `user_tasks` |

---

## Comparativa de controladores clave

### `createTask`

```javascript
// ❌ ANTES — creaba N filas duplicadas en tasks
for (const uid of userIds) {
    await pool.query(
        'INSERT INTO tasks (title, description, userId) VALUES (?, ?, ?)',
        [title, description || null, uid]
    );
}

// ✅ DESPUÉS — una sola fila en tasks, N filas en user_tasks
const [result] = await pool.query(
    'INSERT INTO tasks (title, description) VALUES (?, ?)',
    [title, description || null]
);
const taskId = result.insertId;

for (const uid of listaIds) {
    await pool.query(
        'INSERT INTO user_tasks (task_id, user_id, status) VALUES (?, ?, ?)',
        [taskId, uid, 'pendiente']
    );
}
```

### `patchTaskStatus`

```javascript
// ❌ ANTES — actualizaba el status en tasks por ID de tarea (afectaba a todos)
await pool.query(
    'UPDATE tasks SET status = ? WHERE id = ?',
    [status, req.params.id]
);

// ✅ DESPUÉS — actualiza SOLO la fila del usuario que hace la petición
const userId = req.user.id; // extraído del JWT

await pool.query(
    'UPDATE user_tasks SET status = ? WHERE task_id = ? AND user_id = ?',
    [status, taskId, userId]
);
```

### `getTasksByUser`

```javascript
// ❌ ANTES — buscaba por userId directo en tasks
await pool.query(
    'SELECT * FROM tasks WHERE userId = ?', [req.params.userId]
);

// ✅ DESPUÉS — JOIN entre user_tasks y tasks para traer el estado correcto
await pool.query(`
    SELECT t.id, t.title, t.description, t.createdAt, ut.status
    FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.id DESC
`, [req.params.userId]);
```

---

## Ventajas del nuevo modelo

| Aspecto | Antes | Después |
|---|---|---|
| Filas en BD para 1 tarea con 5 estudiantes | 5 filas en `tasks` | 1 fila en `tasks` + 5 en `user_tasks` |
| Estados independientes por estudiante | ❌ Imposible | ✅ Cada uno tiene el suyo |
| Editar título de una tarea | Actualizar N filas | Actualizar 1 fila |
| Ver cuántos estudiantes tienen la tarea | COUNT con duplicados | COUNT directo en `user_tasks` |
| Integridad referencial | Débil (FK simple) | Fuerte (PK compuesta + CASCADE) |

---

## Commit asociado

```
fix(db): migra relacion tasks-users de uno-a-muchos a muchos-a-muchos

- Elimina campo userId y status de la tabla tasks
- Agrega tabla pivote user_tasks (task_id, user_id, status)
- Reescribe createTask para insertar una tarea y N filas en user_tasks
- Reescribe patchTaskStatus para actualizar solo la fila del usuario en sesion
- Reescribe getTasksByUser con JOIN entre user_tasks y tasks
- Reescribe getTasks, getTaskById, filterTasks, getDashboard con nuevas queries
- Reescribe assignTaskToUsers con INSERT IGNORE en user_tasks
- Reescribe getTaskUsers y removeUserFromTask sobre user_tasks
- Actualiza getUserTasks en users.controller.js con JOIN a user_tasks
```
