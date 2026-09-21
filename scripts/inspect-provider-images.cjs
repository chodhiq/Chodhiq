const sites = [
  ['Leicester Plumbers', 'https://leicesterplumb.co.uk/'],
  ['LT Electrical', 'https://lt-electrical.co.uk/'],
  ['Jaffer Motor Care', 'https://jaffermotorcare.com/'],
  ['M8 PitStop', 'https://www.m8pitstop.co.uk/'],
  ['Amicare', 'https://www.amicare.org.uk/'],
  ['Reliance Community Care', 'https://www.reliancecommunitycare.co.uk/'],
  ['Leicester Accountants', 'https://www.yourleicesteraccountants.co.uk/'],
  ['Insight Consultancy', 'https://insightconsultancy.co.uk/'],
  ['Leicester Moving Company', 'https://www.leicestermovingcompany.co.uk/'],
  ['LTS Couriers', 'https://ltscouriers.co.uk/'],
  ['Emma Brown Hair', 'https://www.emmabrownhair.co.uk/'],
  ['Remy Hair Salon', 'https://www.remyhairsalon.co.uk/'],
  ['Sarafina Events', 'https://sarafinaevents.com/'],
  ['The Event Decor Company', 'https://www.eventdecorcompany.co.uk/'],
  ['Leicester Tutors', 'https://leicester-tutors.co.uk/'],
  ['Leicester Music Lessons', 'https://www.leicestermusiclessons.co.uk/'],
  ['MH Cleaning Solutions', 'https://www.mhcleaningsolutionsltd.co.uk/'],
  ['Leicester Cleaning Service', 'https://www.leicestercleaningservice.co.uk/'],
];

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].replaceAll('&amp;', '&');
  }
  return null;
}

async function inspect([name, url]) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 ChodhiQ provider-source audit' },
    });
    const html = await response.text();
    const socialImage = firstMatch(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i,
    ]);
    const imageSources = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)/gi)]
      .map((match) => match[1].replaceAll('&amp;', '&'))
      .filter((source) => !/logo|icon|avatar|pixel|svg|data:image/i.test(source))
      .slice(0, 8)
      .map((source) => {
        try {
          return new URL(source, response.url).href;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return { name, url: response.url, status: response.status, socialImage, imageSources };
  } catch (error) {
    return { name, url, error: error.message };
  }
}

Promise.all(sites.map(inspect)).then((results) => {
  for (const result of results) console.log(JSON.stringify(result));
});
