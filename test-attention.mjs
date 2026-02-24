import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4324';
const TOTAL_STEPS = 18;
let errors = [];
let passes = 0;

function assert(condition, message) {
  if (!condition) {
    console.log(`  FAIL: ${message}`);
    errors.push(message);
  } else {
    console.log(`  PASS: ${message}`);
    passes++;
  }
}

async function clickToStep(page, target) {
  const current = await page.textContent('#attn-counter');
  const currentStep = parseInt(current.match(/Step (\d+)/)[1]);
  if (currentStep < target) {
    for (let i = currentStep; i < target; i++) {
      await page.click('#attn-next');
      await page.waitForTimeout(100);
    }
  } else if (currentStep > target) {
    for (let i = currentStep; i > target; i--) {
      await page.click('#attn-back');
      await page.waitForTimeout(100);
    }
  }
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('=== Navigating to /attention/ ===');
  await page.goto(`${BASE_URL}/attention/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Page load
  const title = await page.textContent('.attn-title');
  assert(title.includes('Attention Head'), 'Page title present');

  // 2. Counter shows 18
  let counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 18', 'Counter shows Step 1 / 18');

  // 3. Navigation buttons
  assert(await page.getAttribute('#attn-back', 'disabled') !== null, 'Back disabled at step 1');
  assert(await page.getAttribute('#attn-next', 'disabled') === null, 'Next enabled at step 1');

  // 4. Walk forward through all 18 steps
  console.log('\n=== Forward walk ===');
  for (let step = 2; step <= TOTAL_STEPS; step++) {
    await page.click('#attn-next');
    await page.waitForTimeout(step === 6 ? 2500 : 400);
    counter = await page.textContent('#attn-counter');
    const stepTitle = await page.textContent('#attn-ann-title');
    assert(counter === `Step ${step} / ${TOTAL_STEPS}`, `Forward: step ${step} counter correct`);
    console.log(`    title: "${stepTitle}"`);
  }
  assert(await page.getAttribute('#attn-next', 'disabled') !== null, 'Next disabled at step 18');

  // 5. Walk backward
  console.log('\n=== Backward walk ===');
  for (let step = TOTAL_STEPS - 1; step >= 1; step--) {
    await page.click('#attn-back');
    await page.waitForTimeout(400);
    counter = await page.textContent('#attn-counter');
    assert(counter === `Step ${step} / ${TOTAL_STEPS}`, `Backward: step ${step} counter correct`);
  }
  assert(await page.getAttribute('#attn-back', 'disabled') !== null, 'Back disabled at step 1 again');

  // 6. Rapid-click forward
  console.log('\n=== Rapid clicking ===');
  for (let i = 0; i < 5; i++) { await page.click('#attn-next'); await page.waitForTimeout(50); }
  await page.waitForTimeout(1500);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 6 / 18', 'Rapid forward lands on step 6');

  // 7. Rapid-click backward
  for (let i = 0; i < 5; i++) { await page.click('#attn-back'); await page.waitForTimeout(50); }
  await page.waitForTimeout(1500);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 18', 'Rapid backward lands on step 1');

  // 8. d_model label at step 3
  console.log('\n=== Feature checks ===');
  await clickToStep(page, 3);
  const dModelVis = await page.locator('#attn-dmodel-label').evaluate(el => parseFloat(el.style.opacity));
  assert(dModelVis > 0, 'd_model label visible at step 3');

  // 9. Step 3 detail text is in body (no longer collapsible)
  const step3Body = await page.textContent('#attn-ann-body');
  assert(step3Body.includes('lookup table'), 'Step 3 detail text visible in body');

  // 10. Step 6 mentions normalization
  await clickToStep(page, 6);
  const step6Body = await page.textContent('#attn-ann-body');
  assert(step6Body.toLowerCase().includes('normal'), 'Step 6 mentions normalization');

  // 11. Step 8 is d_head
  await clickToStep(page, 8);
  const step8Title = await page.textContent('#attn-ann-title');
  assert(step8Title.toLowerCase().includes('d_head'), 'Step 8 is d_head step');
  const step8Dims = await page.textContent('#attn-ann-dims');
  assert(step8Dims.includes('256'), 'Step 8 dims include 256');

  // 12. Step 11 is Q·K^T Setup
  await clickToStep(page, 11);
  const step11Title = await page.textContent('#attn-ann-title');
  assert(step11Title.includes('Setup') || step11Title.includes('K'), 'Step 11 is Q·K^T setup');

  // 12b. Step 12 is Attention Scores
  await clickToStep(page, 12);
  const step12Title = await page.textContent('#attn-ann-title');
  assert(step12Title.includes('Attention') || step12Title.includes('Scores'), 'Step 12 is attention scores');

  // 13. Step 13 is Mask + Softmax
  await clickToStep(page, 13);
  await page.waitForTimeout(1000);
  const step13Title = await page.textContent('#attn-ann-title');
  assert(step13Title.includes('Mask') || step13Title.includes('Softmax'), 'Step 13 is mask + softmax');

  // 13b. Step 14 is Multi-Head Patterns
  await clickToStep(page, 14);
  await page.waitForTimeout(1000);
  const step14Title = await page.textContent('#attn-ann-title');
  assert(step14Title.includes('Head') || step14Title.includes('Multi') || step14Title.includes('Pattern'), 'Step 14 is multi-head patterns');

  // 14. Step 15 is Value Matrix
  await clickToStep(page, 15);
  await page.waitForTimeout(1000);
  const step15Title = await page.textContent('#attn-ann-title');
  assert(step15Title.includes('Value'), 'Step 15 is value matrix');

  // 14b. Step 16 is Value Weighting
  await clickToStep(page, 16);
  await page.waitForTimeout(1000);
  const step16Title = await page.textContent('#attn-ann-title');
  assert(step16Title.includes('Value') || step16Title.includes('Weighting'), 'Step 16 is value weighting');

  // 15. Step 17 is Head Concatenation
  await clickToStep(page, 17);
  await page.waitForTimeout(1000);
  const step17Title = await page.textContent('#attn-ann-title');
  assert(step17Title.includes('Concatenation') || step17Title.includes('Head'), 'Step 17 is head concatenation');
  const step17Body = await page.textContent('#attn-ann-body');
  assert(step17Body.toLowerCase().includes('concatenat'), 'Step 17 mentions concatenation');

  // 15b. Step 18 is Residual Stream
  await clickToStep(page, 18);
  await page.waitForTimeout(1000);
  const step18Title = await page.textContent('#attn-ann-title');
  assert(step18Title.includes('Residual'), 'Step 18 is residual');
  const step18Body = await page.textContent('#attn-ann-body');
  assert(step18Body.includes('residual') || step18Body.includes('connection'), 'Step 18 mentions residual connection');

  // 16. Keyboard navigation
  console.log('\n=== Keyboard nav ===');
  await clickToStep(page, 1);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 2 / 18', 'ArrowRight goes to step 2');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 18', 'ArrowLeft goes back to step 1');

  // 17. No console errors
  assert(consoleErrors.length === 0, `No console errors (found ${consoleErrors.length})`);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.log(`    ERROR: ${e}`));
  }

  // Summary
  console.log('\n========================================');
  console.log(`PASSED: ${passes}`);
  console.log(`FAILED: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('\nALL CHECKS PASSED!');
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => { console.error('Test crashed:', err); process.exit(1); });
