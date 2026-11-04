import { test, expect, type Page } from '@playwright/test';

// Supabase está configurado: la app muestra primero la puerta de acceso.
// "Jugar sin cuenta" lleva a la portada de creación del peque.
async function jugarSinCuenta(page: Page) {
  await page.goto('/');
  const sinCuenta = page.getByRole('button', { name: /Jugar sin cuenta/ });
  // El acceso va en un chunk lazy: puede tardar en aparecer.
  await sinCuenta.waitFor({ state: 'visible', timeout: 20_000 });
  await sinCuenta.click();
}

// Responde la puerta de la zona de padres (suma aleatoria de dos números).
async function abrirZonaPadres(page: Page) {
  await page.locator('.kid-avatar').click({ delay: 1900 });
  const texto = await page.getByText(/Solo adultos: ¿cuánto es/).innerText();
  const numeros = texto.match(/\d+/g) || [];
  const suma = numeros.map(Number).reduce((a, b) => a + b, 0);
  await page.fill('#respuesta-padres', String(suma));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /Zona de padres/ })).toBeVisible();
}

// Crea un peque (nombre + rango + evaluación con la primera opción).
async function crearPeque(page: Page, nombre: string) {
  await jugarSinCuenta(page);
  await expect(page.getByText('Hola papá y mamá 👋')).toBeVisible();
  await page.fill('#nombre-peque', nombre);
  await page.getByRole('radio', { name: /6 a 8/ }).click();
  await page.getByRole('button', { name: /Empezar a leer con amor/ }).click();
  for (let i = 0; i < 10; i++) {
    const enPregunta = page.getByText(/Pregunta \d+ de \d+/);
    if (!(await enPregunta.isVisible().catch(() => false))) break;
    await page.locator('.letter-btn').first().click();
    await page.waitForTimeout(150);
  }
  await page.getByRole('button', { name: /¡Empezar a leer!/ }).click();
}

test('la portada carga y deja crear un peque con evaluación inicial', async ({ page }) => {
  await page.goto('/');
  // Con Supabase configurado, primero aparece la puerta de acceso.
  await expect(page.getByText('Entra o juega sin cuenta 💛')).toBeVisible();

  await crearPeque(page, 'Sofi');
  await expect(page.getByText(/¡Hola, Sofi!/)).toBeVisible();
  // La evaluación puede colocar al peque en cualquier lección inicial.
  await expect(page.getByText(/Lección \d+\//).first()).toBeVisible();
});

test('más juegos: refuerzo, cuentos, álbum y zona de padres con semáforo', async ({ page }) => {
  await crearPeque(page, 'Sofi');
  await expect(page.getByText(/¡Hola, Sofi!/)).toBeVisible();

  // Pestaña "Más juegos" con los nuevos juegos
  await page.getByRole('button', { name: /Más juegos/ }).click();
  await expect(page.getByRole('button', { name: /💪 Refuerzo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /📚 Cuentos/ })).toBeVisible();

  await page.getByRole('button', { name: /💪 Refuerzo/ }).click();
  // El texto aparece en el título del nivel y en el mensaje del bot.
  await expect(page.getByText(/Practicamos lo que más te cuesta/).first()).toBeVisible();

  await page.getByRole('button', { name: /📚 Cuentos/ }).click();
  await expect(page.getByText('📚 Elige un cuento')).toBeVisible();
  await page.getByRole('button', { name: /El sol y la luna/ }).click();
  await expect(page.getByText('📖 Storytime con Léo')).toBeVisible();

  // Álbum de insignias desde la pestaña Jugar
  await page.getByRole('button', { name: /Jugar letras/ }).click();
  const album = page.getByRole('button', { name: /Álbum/ });
  if (await album.isVisible().catch(() => false)) {
    await album.click();
    await expect(page.getByRole('heading', { name: /Mi álbum de insignias/ })).toBeVisible();
    await page.getByRole('button', { name: /Seguir jugando/ }).click();
  }

  // Zona de padres: suma correcta + semáforo de servicios
  await abrirZonaPadres(page);
  await page.getByRole('button', { name: /🚦 Estado/ }).click();
  await expect(page.getByText('Semáforo de servicios')).toBeVisible();
  await expect(page.getByText(/Internet en este aparato/)).toBeVisible();
});

test('solo lectura muestra el banco ampliado de palabras y oraciones', async ({ page }) => {
  await crearPeque(page, 'Ana');
  await expect(page.getByText(/¡Hola, Ana!/)).toBeVisible();

  await page.getByRole('button', { name: /Solo lectura/ }).click();
  await expect(page.getByRole('button', { name: /🎤 Leer en voz alta/ })).toBeVisible();
  // La baraja es aleatoria: puede empezar por palabra u oración, pero el
  // botón de ejemplo y el de lectura deben estar operativos.
  await expect(page.getByRole('button', { name: /🔊 Escucha el ejemplo/ })).toBeVisible();
});
