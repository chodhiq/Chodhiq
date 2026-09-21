/* oxlint-disable next/no-img-element -- Static export uses local, pre-sized launch artwork. */
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  House,
  Mail,
  MapPin,
  MessageCircle,
  Scissors,
  Search,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
  Utensils,
} from 'lucide-react';

const emailLink = 'mailto:chodhiq@gmail.com?subject=ChodhiQ%20provider%20enquiry';
function Logo() {
  return (
    <span className="logo">
      <img className="logo-white" src="/chodhiq-logo-transparent.png" alt="ChodhiQ" width="2170" height="725" />
      <img className="logo-colour" src="/chodhiq-logo-transparent.png" alt="" width="2170" height="725" aria-hidden="true" />
    </span>
  );
}
const categories = [
  { icon: Utensils, label: 'Restaurants', image: '/food.webp' },
  { icon: ShoppingBasket, label: 'Grocery stores', image: '/grocery.webp' },
  { icon: Scissors, label: 'Beauty & wellness', image: '/beauty.webp' },
  { icon: House, label: 'Home services', image: '/community.png' },
  { icon: Camera, label: 'Photography', image: '/restaurant-interior.webp' },
];
function PhonePreview() {
  return (
    <div className="app-preview">
      <img
        src="/app-preview-hq.png"
        alt="Three phones showing the ChodhiQ welcome, map and nearby results screens"
        width="1384"
        height="1136"
      />
    </div>
  );
}
export default function Home() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header shell">
        <a href="#main" aria-label="ChodhiQ home">
          <Logo />
        </a>
        <nav>
          <a href="#about">About</a>
          <a href="#business">For businesses</a>
          <a href="#contact">Contact</a>
          <a className="nav-cta" href={emailLink}>
            Join early
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-bg">
            <img src="/london.png" alt="London at golden hour" />
          </div>
          <div className="hero-inner shell">
            <div className="hero-copy">
              <p className="overline">LOCAL BUSINESSES. REAL PEOPLE.</p>
              <h1>
                Find what you need.
                <br />
                <em>Discover who’s nearby.</em>
              </h1>
              <p>
                ChodhiQ helps the Malayalee community in the UK discover trusted local businesses,
                services and places nearby.
              </p>
              <div className="actions">
                <a className="button lime" href="#about">
                  Explore ChodhiQ <ArrowRight size={18} />
                </a>
                <a className="button ghost" href={emailLink}>
                  List your business
                </a>
              </div>
              <span className="coming">
                <Sparkles size={16} />
                Mobile app coming soon
              </span>
            </div>
            <PhonePreview />
            <p className="script hero-note">
              Good businesses
              <br />
              are closer
              <br />
              than you think.
            </p>
          </div>
        </section>
        <section className="how shell" id="about">
          <div>
            <p className="script">How it works</p>
            <h2>Ask. Discover. Connect.</h2>
            <p className="sub">Finding the right local business becomes simple.</p>
            <ol className="flow">
              <li>
                <i>
                  <Search />
                </i>
                <b>1. Ask</b>
                <span>Search for what you need in your area.</span>
              </li>
              <li>
                <i>
                  <MapPin />
                </i>
                <b>2. Discover</b>
                <span>Explore local businesses and services.</span>
              </li>
              <li>
                <i>
                  <MessageCircle />
                </i>
                <b>3. Connect</b>
                <span>Contact the provider and get it done.</span>
              </li>
            </ol>
          </div>
          <div className="community-photo">
            <img src="/community.png" alt="A woman using her phone in a local café" />
            <div className="search-pill">
              Kerala grocery near me <Search size={17} />
            </div>
            <span className="pin">
              <MapPin />
            </span>
            <p className="script">
              Local people.
              <br />
              Real connections.
            </p>
          </div>
        </section>
        <section className="business" id="business">
          <div className="business-inner shell">
            <div className="business-copy">
              <p className="script">For businesses</p>
              <h2>
                Stop getting overlooked.
                <br />
                <em>Start getting discovered.</em>
              </h2>
              <p>
                People are already looking for what you offer. ChodhiQ helps you get found, build
                trust and reach more customers.
              </p>
              <a className="button dark" href={emailLink}>
                List your business <ArrowRight size={18} />
              </a>
            </div>
            <ul className="benefits">
              <li>
                <Search />
                <span>
                  <b>Get discovered</b> by nearby customers
                </span>
              </li>
              <li>
                <BadgeCheck />
                <span>
                  <b>Build trust</b> with verification
                </span>
              </li>
              <li>
                <Sparkles />
                <span>
                  <b>Showcase</b> services and offers
                </span>
              </li>
              <li>
                <TrendingUp />
                <span>
                  <b>Grow</b> your local presence
                </span>
              </li>
            </ul>
            <div className="provider-photo">
              <img src="/provider.png" alt="A local business owner standing in his café" />
              <p className="script">
                Be visible.
                <br />
                Be trusted.
                <br />
                Be on ChodhiQ.
              </p>
            </div>
          </div>
        </section>
        <section className="community shell">
          <div>
            <p className="script">Starting with our community</p>
            <h2>
              Built for the Malayalee
              <br />
              community in the UK.
            </h2>
            <p className="sub">We’re beginning with our roots—and this is just the start.</p>
          </div>
          <div className="uk-mark">
            <b>UK</b>
            <p className="script">
              First here.
              <br />
              More places next.
            </p>
          </div>
          <div className="category-row">
            {categories.map(({ icon: Icon, label, image }) => (
              <span key={label}>
                <i>
                  <img src={image} alt="" />
                </i>
                <b>
                  <Icon size={13} />
                  {label}
                </b>
              </span>
            ))}
            <span>
              <i className="more">
                <Sparkles />
              </i>
              <b>And more</b>
            </span>
          </div>
        </section>
        <section className="contact" id="contact">
          <div className="contact-inner shell">
            <div>
              <Logo />
              <p>Ask. Discover. Connect. Grow.</p>
            </div>
            <div>
              <h2>Be part of the beginning.</h2>
              <p>Providers can introduce their business and get launch updates.</p>
            </div>
            <a className="email" href={emailLink}>
              <Mail />
              chodhiq@gmail.com
              <ArrowRight />
            </a>
            <p className="script note">
              Same people.
              <br />
              More possibilities.
            </p>
          </div>
        </section>
      </main>
      <footer className="footer shell">
        <p>© 2026 ChodhiQ. All rights reserved.</p>
        <nav>
          <a href="#about">About</a>
          <a href="#business">Businesses</a>
          <a href={emailLink}>Contact</a>
        </nav>
      </footer>
    </>
  );
}
