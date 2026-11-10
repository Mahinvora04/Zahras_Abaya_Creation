import { ArrowUpRight, Gem, Heart, Mail, MapPin, Phone, Scissors, Sparkles } from 'lucide-react';

import { Link } from 'react-router-dom';
import { storeContact } from '../config/storeContact';
import mediaUrl from '../utils/mediaUrl';

export default function About() {
  return (
    <div className="bg-stone-50 text-stone-900">
      
      {/* ----------------- HERO SECTION ----------------- */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center bg-stone-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img 
            src={mediaUrl('/uploads/about/about_1.png')}
            alt="Luxury Fabric" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <span className="inline-block text-xs tracking-[0.3em] text-amber-300 uppercase font-medium mb-4">
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-light leading-tight mb-6">
            The Art of Modest Elegance
          </h1>
          <p className="text-stone-300 text-base md:text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Where timeless tradition meets contemporary grace. Discover the soul behind Zahra's Abaya Creation.
          </p>
        </div>
      </section>

      {/* ----------------- OUR STORY ----------------- */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <img 
              src={mediaUrl('/uploads/about/about_2.jpeg')}
              alt="Our Atelier" 
              className="w-full h-[500px] object-cover rounded-sm shadow-xl"
            />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-100 -z-10 rounded-sm hidden md:block"></div>
          </div>
          <div className="space-y-6">
            <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
              Established with Passion
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light text-stone-900">
              Born from a Love for Modesty
            </h2>
            <p className="text-stone-600 leading-relaxed font-light">
              Zahra's Abaya Creation began as a simple vision: to provide women with modest wear that doesn't compromise on luxury, comfort, or style. We believe that covering up should feel like an expression of grace, not a limitation.
            </p>
            <p className="text-stone-600 leading-relaxed font-light">
              Every piece in our collection is thoughtfully designed and meticulously crafted. From the initial sketch to the final stitch, we pour our hearts into creating abayas, hijabs, and kaftans that make you feel confident, elegant, and truly yourself.
            </p>
            <div className="pt-4">
              <Link 
                to="/products" 
                className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-stone-900 font-semibold border-b border-stone-900 pb-1 hover:text-amber-800 hover:border-amber-800 transition-colors"
              >
                Explore Our Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- OUR VALUES ----------------- */}
      <section className="bg-white border-y border-stone-200 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
              What We Stand For
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light mt-3 text-stone-900">
              Our Core Values
            </h2>
            <div className="w-12 h-0.5 bg-amber-800/40 mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Gem,
                title: 'Uncompromising Quality',
                desc: 'We source only the finest Nida, Crepe, and Silk fabrics from around the world, ensuring every garment drapes beautifully and lasts for years.'
              },
              {
                icon: Scissors,
                title: 'Master Craftsmanship',
                desc: 'Our skilled artisans bring decades of experience to every stitch. We blend traditional tailoring techniques with modern, flattering silhouettes.'
              },
              {
                icon: Heart,
                title: 'Empowering Modesty',
                desc: 'We design for the modern, confident woman. Our pieces are created to make you feel empowered, comfortable, and radiant in your own skin.'
              }
            ].map((value, i) => (
              <div key={i} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-800 mb-6 group-hover:bg-amber-800 group-hover:text-white transition-colors duration-300">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-serif text-stone-900 mb-3">{value.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed font-light">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- THE PROCESS ----------------- */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 space-y-6">
            <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
              From Thread to Treasure
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-light text-stone-900">
              Crafted with Intention
            </h2>
            <p className="text-stone-600 leading-relaxed font-light">
              Creating the perfect abaya is a labor of love. It starts with selecting the right fabric—feeling its weight, testing its drape, and ensuring its breathability. 
            </p>
            <p className="text-stone-600 leading-relaxed font-light">
              Once the material is chosen, our designers draft patterns that flatter diverse body types. Every seam is reinforced, every embellishment is hand-placed, and every garment is rigorously inspected before it is carefully packaged and sent to you.
            </p>
          </div>
          <div className="order-1 md:order-2 relative">
            <img 
              src={mediaUrl('/uploads/about/about_3.jpeg')} 
              alt="Tailoring Process" 
              className="w-full h-[500px] object-cover rounded-sm shadow-xl"
            />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-stone-200 -z-10 rounded-sm hidden md:block"></div>
          </div>
        </div>
      </section>

      {/* ----------------- FOUNDER'S NOTE ----------------- */}
      <section className="bg-stone-100 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Sparkles className="w-8 h-8 text-amber-700 mx-auto mb-6" />
          <blockquote className="text-2xl md:text-3xl font-serif font-light text-stone-800 leading-relaxed mb-8">
            "Where modesty meets timeless elegance. At Zahra’s Abaya Creation, we craft beautiful abayas that blend refined designs, graceful details, and effortless comfort, making every woman feel confident, beautiful, and truly special."
          </blockquote>
          <div className="w-16 h-0.5 bg-amber-800/40 mx-auto mb-6" />
        </div>
      </section>

      {/* ----------------- SHOP CONTACT DETAILS ----------------- */}
      <section className="border-y border-stone-200 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-800">
              Visit or Contact Us
            </span>
            <h2 className="mt-3 font-serif text-3xl font-light text-stone-900 sm:text-4xl">
              We&apos;d love to hear from you
            </h2>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Visit our shop or get in touch with our team for help with your order.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="border border-stone-200 bg-stone-50/60 p-6">
              <MapPin aria-hidden="true" className="h-5 w-5 text-amber-800" />
              <h3 className="mt-4 font-serif text-lg text-stone-900">Shop address</h3>
              <address className="mt-2 text-sm not-italic leading-6 text-stone-600">
                {storeContact.address}
              </address>
              <a
                href={storeContact.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-900 transition-colors hover:text-stone-900"
              >
                Get directions <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </article>

            <article className="border border-stone-200 bg-stone-50/60 p-6">
              <Phone aria-hidden="true" className="h-5 w-5 text-amber-800" />
              <h3 className="mt-4 font-serif text-lg text-stone-900">Call us</h3>
              <p className="mt-2 text-sm text-stone-600">Speak with us about your order or visit.</p>
              <a
                href={storeContact.phoneHref}
                className="mt-4 inline-block text-sm font-medium text-stone-900 transition-colors hover:text-amber-900"
              >
                {storeContact.phone}
              </a>
            </article>

            <article className="border border-stone-200 bg-stone-50/60 p-6">
              <Mail aria-hidden="true" className="h-5 w-5 text-amber-800" />
              <h3 className="mt-4 font-serif text-lg text-stone-900">Email us</h3>
              <p className="mt-2 text-sm text-stone-600">We&apos;re happy to help with any questions.</p>
              <a
                href={`mailto:${storeContact.email}`}
                className="mt-4 inline-block break-all text-sm font-medium text-stone-900 transition-colors hover:text-amber-900"
              >
                {storeContact.email}
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* ----------------- CTA SECTION ----------------- */}
      <section className="bg-stone-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-serif font-light mb-6">
            Experience the Difference
          </h2>
          <p className="text-stone-400 text-base md:text-lg font-light mb-10 max-w-2xl mx-auto">
            Step into a world of refined modesty. Explore our latest collection and find the piece that speaks to your soul.
          </p>
          <Link
            to="/products"
            className="inline-block bg-amber-200 text-stone-900 px-10 py-4 text-xs font-semibold tracking-widest uppercase hover:bg-amber-300 transition-colors shadow-lg"
          >
            Shop The Collection
          </Link>
        </div>
      </section>

    </div>
  );
}
