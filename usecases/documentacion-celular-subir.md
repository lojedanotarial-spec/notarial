# UC-1: Subir documentación desde el celular

**Feature:** [Subir documentación al expediente desde el celular](../features/subir-documentacion-celular.md)

## Actor

Cualquier usuario del registro con sesión iniciada en la compu y un celular (iPhone o Android) en
la mano, con la documentación física delante.

## Disparador

Tiene a la persona en el mostrador con su DNI, la tarjeta verde, un poder, etc., y quiere dejar todo
guardado en el expediente sin pasar por un escáner ni mandarse fotos por WhatsApp.

## Flujo esperado

1. En la compu, abre el expediente, pestaña **Archivos**, y toca **Subir desde el celular**. Aparece
   un QR.
2. Escanea el QR con el celular. Se abre una página (sin pedir que inicie sesión) que ya sabe de qué
   expediente se trata.
3. Saca las fotos de **todos** los documentos, una atrás de otra y en cualquier orden, o las elige de
   la galería. **No tiene que decir qué es cada una.**
4. Cada foto se sube sola, de a una, mostrando que se guardó. Si alguna falla, se puede reintentar
   sin repetir las demás.
5. En la compu, la lista de archivos del expediente se va completando sola. Cada archivo aparece
   primero como "Identificando…" y enseguida con su nombre definitivo (ver UC-4).
6. Termina tocando **Listo** en el celular, o cerrando la sesión desde la compu.

## Resultado esperado

Todos los archivos quedan en el Drive de la escribanía, en la carpeta del expediente, en calidad
original, con un nombre que dice qué son, y los ve todo el registro. La persona que escaneó el QR no
necesitó tener cuenta ni iniciar sesión en el celular, ni clasificar nada.

## Casos borde

- El registro no tiene Drive conectado: el botón "Subir desde el celular" avisa por qué no se puede.
- Se saca una foto movida o cortada: se puede sacar otra y quitar la mala (ver UC-3).
- Un archivo pesa más de 25 MB: se avisa en el celular qué archivo es y que no se subió, y se sigue
  con los demás.
- No hay tope de cantidad de archivos por sesión.
- Alguien escanea el QR de un expediente de otro registro: no existe esa posibilidad, el código solo
  sirve para el expediente para el que se generó.
- Dos celulares usan el mismo QR a la vez: ambos pueden subir al mismo expediente.
- El QR dura poco (minutos, se renueva con cada foto): si venció, se genera otro desde la compu.

## Estado actual

Subir archivos a un expediente solo se puede desde la compu, con el botón **Subir archivos** (ya
guarda en el Drive de la escribanía), eligiendo el tipo de una lista antes de subir. La captura por
QR existe pero es otra cosa: lee datos de los documentos y borra las fotos.
