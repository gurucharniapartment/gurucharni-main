import { Link } from 'react-router-dom'
import { Building2, ShieldCheck } from 'lucide-react'
import { useI18n, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Header({ isAdmin }: { isAdmin?: boolean }) {
  const { t, lang, setLang } = useI18n()

  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--color-border)]"
      style={{
        background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-black/5 transition-transform duration-150 group-active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0f5132 0%, #1a7a4c 100%)' }}
          >
            <Building2 className="h-[19px] w-[19px]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold tracking-tight">{t('app_title')}</div>
            <div className="hidden truncate text-[11px] text-[var(--color-muted-foreground)] sm:block">{t('app_subtitle')}</div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {/* iOS-style segmented language control */}
          <div className="flex rounded-full bg-[var(--color-secondary)] p-0.5">
            {(['en', 'mr'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[12px] font-medium transition-all duration-150',
                  lang === l
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {l === 'en' ? 'EN' : 'मराठी'}
              </button>
            ))}
          </div>
          <Link to={isAdmin ? '/admin' : '/login'}>
            <Button variant={isAdmin ? 'default' : 'secondary'} size="sm" className="px-3">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">{isAdmin ? t('admin') : t('admin_login')}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
