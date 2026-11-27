import Image from 'next/image'
import Link from 'next/link'

const slides = [
  {
    src: '/images/campus-festival.png',
    alt: 'Students enjoying a live festival on a university lawn',
  },
  {
    src: '/images/arts-showcase.png',
    alt: 'Students meeting at a contemporary campus art showcase',
  },
  {
    src: '/images/arena-night.png',
    alt: 'Students cheering during a university arena game',
  },
  {
    src: '/images/tech-summit.png',
    alt: 'Students attending a technology summit in a university auditorium',
  },
]

export function HeroSlider() {
  return (
    <section className="relative min-h-[760px] overflow-hidden bg-[#061b13] text-white lg:min-h-[820px]">
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((slide, index) => (
          <div className={`hero-slide hero-slide-${index + 1}`} key={slide.src}>
            <Image
              alt={slide.alt}
              className="object-cover"
              fill
              priority={index === 0}
              sizes="100vw"
              src={slide.src}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,24,16,.97)_0%,rgba(3,24,16,.82)_34%,rgba(3,24,16,.25)_68%,rgba(3,24,16,.32)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,24,16,.65)_0%,transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[760px] max-w-[1440px] flex-col px-6 pb-12 pt-7 sm:px-10 lg:min-h-[820px] lg:px-16">
        <header className="flex items-center justify-between border-b border-white/15 pb-5">
          <Link aria-label="Ticketify home" className="relative block h-14 w-32 sm:w-40" href="/">
            <Image
              alt="Ticketify"
              className="object-contain object-left"
              fill
              priority
              sizes="160px"
              src="/images/ticketify-nav-logo.png"
            />
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
            <Link className="transition hover:text-white" href="/discover">Explore events</Link>
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <Link className="transition hover:text-white" href="/waitlist">Waitlist</Link>
            <a className="transition hover:text-white" href="#contact">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:block" href="/login">
              Log in
            </Link>
            <Link className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0b2a1d] transition hover:bg-[#c8ff66]" href="/signup">
              Get started
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center py-20 lg:py-24">
          <div className="max-w-3xl">
            <h1 className="max-w-3xl text-[clamp(3.5rem,8vw,7.5rem)] font-black leading-[0.88] tracking-[-0.065em]">
              Don&apos;t miss
              <span className="block text-[#c8ff66]">the moment.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/74 sm:text-xl">
              Discover campus events, claim your seat, and let the waitlist work for you. One student, one fair chance.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link className="group inline-flex items-center gap-3 rounded-full bg-[#c8ff66] px-7 py-4 text-sm font-extrabold text-[#0a261b] transition hover:-translate-y-0.5 hover:bg-white" href="/discover">
                Explore upcoming events
                <svg aria-hidden="true" className="size-4 transition group-hover:translate-x-1" fill="none" viewBox="0 0 24 24">
                  <path d="m5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </Link>
              <a className="rounded-full border border-white/30 px-7 py-4 text-sm font-bold text-white backdrop-blur transition hover:border-white hover:bg-white/10" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-8">
          <div className="flex gap-2" aria-label="Hero slide progress">
            {slides.map((slide, index) => (
              <span className={`hero-progress hero-progress-${index + 1}`} key={slide.src} />
            ))}
          </div>
          <p className="hidden max-w-[240px] text-right text-xs leading-5 text-white/55 sm:block">
            Built for high-demand drops with transparent seat counts and automatic waitlist allocation.
          </p>
        </div>
      </div>
    </section>
  )
}
