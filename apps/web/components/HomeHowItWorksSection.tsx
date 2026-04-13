import Link from 'next/link'

const GH = 'https://github.com/RomandemAi/Tevad.ro' as const

export default function HomeHowItWorksSection() {
  return (
    <section
      id="cum-functioneaza"
      className="scroll-mt-24 border-b border-[var(--gray-200)] bg-[var(--gray-50)] md:scroll-mt-0"
      aria-labelledby="cum-functioneaza-heading"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-9 md:px-10 md:py-11">
        <h2
          id="cum-functioneaza-heading"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--gray-600)]"
        >
          Cum funcționează
        </h2>
        <p className="mt-4 max-w-3xl font-sans text-[16px] font-semibold leading-snug text-[var(--gray-900)] md:text-[17px]">
          Tevad este un registru public: promisiuni, declarații și voturi (unde există înregistrări), fiecare cu dată,
          text, surse și status — nu comentarii editoriale pe lângă fapt.
        </p>
        <ul className="mt-5 max-w-3xl list-disc space-y-2.5 pl-5 font-sans text-[15px] leading-relaxed text-[var(--gray-700)]">
          <li>
            <strong className="font-semibold text-[var(--gray-900)]">Scorul (0–100)</strong> combină patru măsurători
            cu ponderi fixe și publice: promisiuni 35%, reacții (like/dislike, limitate per dispozitiv) 20%, calitatea
            surselor pe înregistrare 25%, consistența între afirmații pe același subiect 20%. Orice schimbare de
            formulă e menită să treacă prin revizuire în depozitul open-source.
          </li>
          <li>
            <strong className="font-semibold text-[var(--gray-900)]">Verificarea</strong> folosește un flux „blind” în
            cod: pe durata apelului modelului nu se trimite numele sau partidul politicianului, ci textul afirmației,
            data și extrase din surse. Unde există loguri, verdictul poate fi inspectat la{' '}
            <Link href="/promises" className="text-[var(--blue)] underline-offset-2 hover:underline">
              înregistrări
            </Link>{' '}
            / pagina de audit a înregistrării.
          </li>
          <li>
            <strong className="font-semibold text-[var(--gray-900)]">Surse</strong> trebuie să fie URL-uri publice și
            atribuibile. În charterul de neutralitate, un verdict <em>fals</em> cere cel puțin două surse Tier-1
            independente (sau o sursă oficială relevantă plus Tier-1); îndoiala rămâne în „în verificare”.
          </li>
        </ul>
        <p className="mt-6 font-sans text-[14px] leading-relaxed text-[var(--gray-600)]">
          Detalii despre proiect și reguli:{' '}
          <Link href="/about#despre" className="text-[var(--blue)] underline-offset-2 hover:underline">
            Despre
          </Link>
          {' · '}
          <Link href="/about#neutralitate" className="text-[var(--blue)] underline-offset-2 hover:underline">
            Neutralitate
          </Link>
          {' · '}
          <a
            href={`${GH}/blob/main/SCORING.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--blue)] underline-offset-2 hover:underline"
          >
            Formula scorului (SCORING.md)
          </a>
          {' · '}
          <a
            href={`${GH}/blob/main/NEUTRALITY.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--blue)] underline-offset-2 hover:underline"
          >
            Charter neutralitate (NEUTRALITY.md)
          </a>
        </p>
      </div>
    </section>
  )
}
