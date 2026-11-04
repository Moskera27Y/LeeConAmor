// Capturas responsivas: recorre las pantallas clave en 3 tamaños y guarda PNG.
// Uso: node scripts/capturas.mjs  (requiere el dev server en localhost:5199)
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5199';
const SALIDA = 'test-results/capturas';
const VIEWPORTS = [
  [375, 667, 'movil'],
  [768, 1024, 'tablet'],
  [1280, 800, 'pc'],
];

fs.mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch();

for (const [w, h, nombre] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-ES' });
  const page = await ctx.newPage();
  const shot = (n) => page.screenshot({ path: `${SALIDA}/${nombre}-${n}.png` });

  try {
    await page.goto(BASE);
    const sinCuenta = page.getByRole('button', { name: /Jugar sin cuenta/ });
    await sinCuenta.waitFor({ state: 'visible', timeout: 20000 });
    await shot('01-acceso');
    await sinCuenta.click();

    await page.fill('#nombre-peque', 'Sofi');
    await page.getByRole('radio', { name: /6 a 8/ }).click();
    await shot('02-portada');
    await page.getByRole('button', { name: /Empezar a leer con amor/ }).click();
    for (let i = 0; i < 10; i++) {
      const enPregunta = page.getByText(/Pregunta \d+ de \d+/);
      if (!(await enPregunta.isVisible().catch(() => false))) break;
      await page.locator('.letter-btn').first().click();
      await page.waitForTimeout(120);
    }
    // La recomendación IA puede tardar hasta 25 s en abortar y caer al
    // cálculo local (sin servidor de API en este puerto).
    await page.getByRole('button', { name: /¡Empezar a leer!/ }).click({ timeout: 60_000 });
    await page.getByText(/¡Hola, Sofi!/).waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await shot('03-juego');

    await page.getByRole('button', { name: /Solo lectura/ }).click();
    await page.getByRole('button', { name: /🎤 Leer en voz alta/ }).waitFor();
    await shot('04-lectura');

    await page.getByRole('button', { name: /Más juegos/ }).click();
    await page.getByRole('button', { name: /💪 Refuerzo/ }).waitFor();
    await shot('05-mas-juegos');

    await page.getByRole('button', { name: /💪 Refuerzo/ }).click();
    await page.getByText(/Practicamos lo que más te cuesta/).first().waitFor();
    await shot('06-refuerzo');

    await page.getByRole('button', { name: /👂 Escucha y elige/ }).click();
    await page.getByText(/Toca/).first().waitFor();
    await shot('07-escucha');

    await page.getByRole('button', { name: /🧠 Memoria auditiva/ }).click();
    await page.waitForTimeout(400);
    await shot('08-memoria');

    await page.getByRole('button', { name: /👆 Trazo/ }).click();
    await page.getByRole('button', { name: /Empezar trazo/ }).click();
    await page.waitForTimeout(400);
    await shot('09-trazo');

    await page.getByRole('button', { name: /📚 Cuentos/ }).click();
    await page.getByText('📚 Elige un cuento').waitFor();
    await shot('10-cuentos');
    await page.getByRole('button', { name: /El sol y la luna/ }).click();
    await page.getByText('📖 Storytime con Léo').waitFor();
    await shot('11-storytime');

    await page.getByRole('button', { name: /Jugar letras/ }).click();
    const album = page.getByRole('button', { name: /Álbum/ });
    if (await album.isVisible().catch(() => false)) {
      await album.click();
      await page.getByRole('heading', { name: /Mi álbum de insignias/ }).waitFor();
      await shot('12-album');
      await page.getByRole('button', { name: /Seguir jugando/ }).click();
    }

    await page.locator('.kid-avatar').click({ delay: 1900 });
    const texto = await page.getByText(/Solo adultos: ¿cuánto es/).innerText();
    const numeros = (texto.match(/\d+/g) || []).map(Number);
    await page.fill('#respuesta-padres', String(numeros.reduce((a, b) => a + b, 0)));
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('heading', { name: /Zona de padres/ }).waitFor();
    await shot('13-padres');

    await page.getByRole('button', { name: /🚦 Estado/ }).click();
    await page.getByText('Semáforo de servicios').waitFor();
    await shot('14-estado');
    console.log(`OK ${nombre} (${w}x${h})`);
  } catch (e) {
    console.log(`FALLO ${nombre}: ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();
console.log('Listo:', SALIDA);
