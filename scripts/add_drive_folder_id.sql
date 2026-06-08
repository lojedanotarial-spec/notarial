-- Agrega columna para guardar el ID de la carpeta de Drive por expediente
-- Evita recrear la carpeta cada vez que se sube un archivo
ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS drive_folder_id text;
