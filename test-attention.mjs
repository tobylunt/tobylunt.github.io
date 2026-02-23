import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4324';
const TOTAL_STEPS = 14;
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

  // 2. Counter shows 14
  let counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 14', 'Counter shows Step 1 / 14');

  // 3. Navigation buttons
  assert(await page.getAttribute('#attn-back', 'disabled') !== null, 'Back disabled at step 1');
  assert(await page.getAttribute('#attn-next', 'disabled') === null, 'Next enabled at step 1');

  // 4. Walk forward through all 14 steps
  console.log('\n=== Forward walk ===');
  for (let step = 2; step <= TOTAL_STEPS; step++) {
    await page.click('#attn-next');
    await page.waitForTimeout(step === 6 || step === 13 ? 2500 : 400);
    counter = await page.textContent('#attn-counter');
    const stepTitle = await page.textContent('#attn-ann-title');
    assert(counter === `Step ${step} / ${TOTAL_STEPS}`, `Forward: step ${step} counter correct`);
    console.log(`    title: "${stepTitle}"`);
  }
  assert(await page.getAttribute('#attn-next', 'disabled') !== null, 'Next disabled at step 14');

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
  assert(counter === 'Step 6 / 14', 'Rapid forward lands on step 6');

  // 7. Rapid-click backward
  for (let i = 0; i < 5; i++) { await page.click('#attn-back'); await page.waitForTimeout(50); }
  await page.waitForTimeout(1500);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 14', 'Rapid backward lands on step 1');

  // 8. d_model label at step 3
  console.log('\n=== Feature checks ===');
  await clickToStep(page, 3);
  const dModelVis = await page.locator('#attn-dmodel-label').evaluate(el => parseFloat(el.style.opacity));
  assert(dModelVis > 0, 'd_model label visible at step 3');

  // 9. Collapsible detail at step 3
  const toggleCount = await page.locator('.attn-detail-toggle').count();
  assert(toggleCount > 0, 'Detail toggle present at step 3');
  if (toggleCount > 0) {
    await page.click('.attn-detail-toggle');
    await page.waitForTimeout(200);
    const openCount = await page.locator('.attn-detail-content.open').count();
    assert(openCount > 0, 'Detail content opens on click');
  }

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

  // 12. Step 12 is Q·K^T scores
  await clickToStep(page, 12);
  const step12Title = await page.textContent('#attn-ann-title');
  assert(step12Title.includes('K'), 'Step 12 mentions K');

  // 13. Step 13 is softmax + value weighting
  await clickToStep(page, 13);
  await page.waitForTimeout(3000); // Two-phase
  const step13Title = await page.textContent('#attn-ann-title');
  assert(step13Title.includes('Softmax') || step13Title.includes('Value'), 'Step 13 is softmax/value');

  // 14. Step 14 is residual
  await clickToStep(page, 14);
  const step14Title = await page.textContent('#attn-ann-title');
  assert(step14Title.includes('Residual'), 'Step 14 is residual');
  const step14Body = await page.textContent('#attn-ann-body');
  assert(step14Body.includes('dhead') || step14Body.includes('d_head'), 'Step 14 mentions d_head');

  // 15. Keyboard navigation
  console.log('\n=== Keyboard nav ===');
  await clickToStep(page, 1);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 2 / 14', 'ArrowRight goes to step 2');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  counter = await page.textContent('#attn-counter');
  assert(counter === 'Step 1 / 14', 'ArrowLeft goes back to step 1');

  // 16. No console errors
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
