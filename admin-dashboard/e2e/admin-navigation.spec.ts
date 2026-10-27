import { expect, test } from '@playwright/test';

const localUser = {
  id: '10000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'local-admin@example.test',
  app_metadata: { role: 'admin', provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
};

async function mockLocalSupabase(page: import('@playwright/test').Page) {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/auth/v1/token' || url.pathname === '/auth/v1/token/') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'local-test-access-token',
          refresh_token: 'local-test-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: localUser,
        }),
      });
      return;
    }
    if (url.pathname === '/auth/v1/user' || url.pathname === '/auth/v1/user/') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(localUser) });
      return;
    }
    if (url.pathname === '/auth/v1/logout') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      const headers = { 'content-range': '0-0/0', 'content-type': 'application/json' };
      await route.fulfill({ status: 200, headers, body: route.request().method() === 'HEAD' ? '' : '[]' });
      return;
    }
    if (url.pathname.startsWith('/storage/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
}

test('admin login transitions between routes without a second document request', async ({ page }) => {
  await mockLocalSupabase(page);
  await page.addInitScript(({ user }) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'local-test-access-token',
      refresh_token: 'local-test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user,
    }));
  }, { user: localUser });
  let documentRequests = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.resourceType() === 'document') documentRequests += 1;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Admin control center' })).toBeVisible();
  expect(documentRequests).toBe(1);

  await page.getByRole('link', { name: 'Providers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Provider directory' })).toBeVisible();
  expect(documentRequests).toBe(1);

  await page.getByRole('link', { name: 'Bookings & quotes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Marketplace activity' })).toBeVisible();
  const activityPanels = page.locator('.activity-grid > .panel.table');
  await expect(activityPanels).toHaveCount(2);
  for (const panel of await activityPanels.all()) {
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  expect(documentRequests).toBe(1);
});

test('saved dark theme is applied by the pre-hydration bootstrap', async ({ page }) => {
  await mockLocalSupabase(page);
  await page.addInitScript(() => localStorage.setItem('chodhiq-dashboard-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveJSProperty('style.colorScheme', 'dark');
});

test('admin routes remain aligned within desktop and mobile viewports', async ({ page }) => {
  test.setTimeout(120_000);
  await mockLocalSupabase(page);
  await page.addInitScript(({ user }) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'local-test-access-token',
      refresh_token: 'local-test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user,
    }));
  }, { user: localUser });

  const routes = [
    ['/', 'dashboard'],
    ['/applications', 'applications'],
    ['/providers', 'providers'],
    ['/verification', 'verification'],
    ['/activity', 'activity'],
    ['/demand', 'demand'],
    ['/users', 'users'],
    ['/categories', 'categories'],
    ['/reviews', 'reviews'],
    ['/community', 'community'],
    ['/community/privileges', 'community-privileges'],
    ['/moderation/community', 'moderation-community'],
    ['/moderation/providers', 'moderation-providers'],
    ['/campaigns', 'campaigns'],
    ['/notifications', 'notifications'],
    ['/analytics', 'analytics'],
    ['/admins', 'admins'],
    ['/audit', 'audit'],
  ];

  for (const { width, height } of [
    { width: 1365, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('.page[data-route="dashboard"]')).toBeVisible();
    for (const [href, route] of routes) {
      if (href !== '/') {
        if (width < 761) await page.getByRole('button', { name: 'Open navigation' }).click();
        await page.locator(`.admin-sidebar a[href="${href}"]`).click();
        await expect(page.locator(`.page[data-route="${route}"]`)).toBeVisible();
      }
      if (width > 1100) {
        const headerLayout = await page.evaluate(() => {
          const header = document.querySelector('.workspace > .topbar')!.getBoundingClientRect();
          const account = document.querySelector('.account-menu')!.getBoundingClientRect();
          const page = document.querySelector('.page')!;
          const panel = document.querySelector('.panel') ?? page;
          const topbar = document.querySelector('.workspace > .topbar')!;
          return {
            headerTop: header.top,
            headerBottom: header.bottom,
            accountTop: account.top,
            accountBottom: account.bottom,
            gridColumns: getComputedStyle(topbar).gridTemplateColumns,
            pageAnimation: getComputedStyle(page).animationName,
            panelTransition: getComputedStyle(panel).transitionProperty,
            panelTransitionDuration: getComputedStyle(panel).transitionDuration,
            children: [...topbar.children].map((child) => ({
              className: typeof child.className === 'string' ? child.className : child.tagName,
              display: getComputedStyle(child).display,
              top: child.getBoundingClientRect().top,
              bottom: child.getBoundingClientRect().bottom,
            })),
          };
        });
        expect(headerLayout.accountTop, JSON.stringify(headerLayout)).toBeGreaterThanOrEqual(headerLayout.headerTop);
        expect(headerLayout.accountBottom, JSON.stringify(headerLayout)).toBeLessThanOrEqual(headerLayout.headerBottom);
        expect(headerLayout.pageAnimation).toBe('none');
        expect(headerLayout.panelTransitionDuration).toBe('0s');
      }
      if (href === '/notifications') {
        await page.getByLabel('Title').fill('Smooth update');
        await expect(page.locator('.notification-preview b')).toHaveText('Smooth update');
      }
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const overflow = documentWidth > width
        ? await page.evaluate(() =>
            [...document.body.querySelectorAll<HTMLElement>('*')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  element: `${element.tagName.toLowerCase()}.${typeof element.className === 'string' ? element.className.trim().replace(/\s+/g, '.') : ''}`,
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                  scrollWidth: element.scrollWidth,
                };
              })
              .filter((element) => element.right > window.innerWidth + 1)
              .slice(0, 6),
          )
        : [];
      expect(documentWidth, `${href} overflows at ${width}px: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(width);
    }
  }
});

test('confirmation dialog keeps readable theme contrast', async ({ page }) => {
  await mockLocalSupabase(page);
  await page.addInitScript(({ user }) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: 'local-test-access-token',
      refresh_token: 'local-test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user,
    }));
  }, { user: localUser });

  await page.goto('/');
  const themes = await page.evaluate(() => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<section class="confirm-modal"><h2>Dismiss report</h2><p>Close this report without changing the underlying record?</p><label>Confirmation<input value="Reviewed"></label><footer><button>Cancel</button><button class="danger">Dismiss report</button></footer></section>';
    document.body.append(backdrop);
    const element = backdrop.querySelector('.confirm-modal')!;
    const input = element.querySelector('input')!;
    return ['dark', 'light'].map((theme) => {
      document.documentElement.dataset.theme = theme;
      const dialogStyle = getComputedStyle(element);
      const titleStyle = getComputedStyle(element.querySelector('h2')!);
      const descriptionStyle = getComputedStyle(element.querySelector('p')!);
      const inputStyle = getComputedStyle(input);
      return {
        theme,
        background: dialogStyle.backgroundColor,
        title: titleStyle.color,
        description: descriptionStyle.color,
        inputBackground: inputStyle.backgroundColor,
        inputText: inputStyle.color,
      };
    });
  });
  for (const styles of themes) {
    expect(styles.theme === 'dark' && styles.background === 'rgb(255, 255, 255)').toBe(false);
    expect(styles.title).not.toBe(styles.background);
    expect(styles.description).not.toBe(styles.background);
    expect(styles.inputBackground).not.toBe(styles.background);
    expect(styles.inputText).not.toBe(styles.inputBackground);
  }
});
