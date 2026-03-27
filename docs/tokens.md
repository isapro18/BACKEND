Crea o abre una request: POST http://localhost:3000/api/auth/login
Body → raw → JSON:
{
  "document": "1001"
}
(o el documento del usuario que exista en tu tabla users)
Send
En la respuesta copia el valor de token (el JWT largo).
Cada vez que envías de nuevo el login, obtienes otro token (válido mientras no expire; en tu backend está en 2 horas).

