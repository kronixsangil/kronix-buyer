# KroniX - Fotos oficiales de conductores

Carpeta oficial:

```txt
public/branding/Driver_Pictures/
```

Esta carpeta debe existir en cada frontend que necesite mostrar la foto del conductor:

- Driver App: para que el conductor vea su foto oficial.
- Buyer App: para que el cliente vea la foto del conductor asignado en tracking.
- CTCC: opcional, para previsualizar la foto desde el panel administrativo.

## Convención de nombres

Recomendado:

```txt
Driver1.jpg
Driver2.jpg
DRV-SANGIL-0001.jpg
```

También se puede usar el nombre del conductor:

```txt
Blass Murillo.jpg
```

Evita caracteres especiales innecesarios. Usa preferiblemente:

- letras,
- números,
- espacios simples,
- guion medio `-`,
- guion bajo `_`.

## Configuración en CTCC

En el perfil del conductor, en la sección **Foto oficial del conductor**, registra solo el nombre exacto del archivo:

```txt
Driver1.jpg
```

El sistema guardará en Neon la ruta:

```txt
/branding/Driver_Pictures/Driver1.jpg
```

El conductor no puede cambiar esta imagen desde Driver App.

## Especificaciones recomendadas de imagen

Formato recomendado:

```txt
JPG
```

Tamaño recomendado:

```txt
600 x 600 px
```

Relación de aspecto:

```txt
1:1 cuadrada
```

Peso recomendado:

```txt
50 KB a 250 KB
```

Peso máximo sugerido:

```txt
500 KB
```

## Cómo tomar o preparar la foto

Para que la foto quede centrada:

1. Usa fondo limpio y claro.
2. Rostro mirando al frente.
3. La cabeza debe quedar centrada horizontalmente.
4. Deja un pequeño margen por encima de la cabeza.
5. Evita fotos de cuerpo completo.
6. Evita selfies con gafas oscuras, casco, tapabocas o filtros.
7. Recorta la imagen en formato cuadrado antes de guardarla.

## Cómo se muestra en la app

Las apps usan:

```css
object-fit: cover;
```

Esto significa que si la imagen no es cuadrada, puede recortarse. Por eso la imagen debe prepararse cuadrada desde el inicio.

## Recomendación operativa

Antes de hacer deploy:

1. Copia el archivo en `public/branding/Driver_Pictures/`.
2. Verifica que el nombre coincida exactamente con el registrado en CTCC.
3. Ejecuta build local si aplica.
4. Haz deploy de Buyer App y Driver App si ambas deben mostrar la misma imagen.

## Ejemplo completo

Archivo en carpeta:

```txt
public/branding/Driver_Pictures/Driver1.jpg
```

Valor registrado desde CTCC:

```txt
Driver1.jpg
```

Ruta guardada en Neon:

```txt
/branding/Driver_Pictures/Driver1.jpg
```
