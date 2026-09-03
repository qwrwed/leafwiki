import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { usePrivacyBlurStore } from './privacyBlur'
import { TooltipWrapper } from '@/components/TooltipWrapper'

export default function PrivacyBlurToggle() {
  const { t } = useTranslation('viewer')
  const active = usePrivacyBlurStore((s) => s.active)
  const toggle = usePrivacyBlurStore((s) => s.toggle)
  const label = active
    ? t('privacyBlurToggle.show')
    : t('privacyBlurToggle.hide')

  return (
    <TooltipWrapper label={label} align="center">
      <Button
        variant="outline"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        onClick={toggle}
        data-testid="privacy-blur-toggle-button"
      >
        {active ? <EyeOff /> : <Eye />}
      </Button>
    </TooltipWrapper>
  )
}
