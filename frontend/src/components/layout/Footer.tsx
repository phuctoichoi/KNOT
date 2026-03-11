import { useTranslation } from 'react-i18next'
import { Facebook, Mail } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-12 pb-8 transition-colors duration-300">
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/icons/knot-logo.png" alt="KNOT Logo" className="h-10 object-contain dark:invert" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t('footer.about')}</h3>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                {t('footer.about')}
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                {t('footer.privacy')}
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors">
                {t('footer.terms')}
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{t('footer.contact')}</h3>
            <div className="flex flex-col gap-4">
              <a 
                href="https://facebook.com/knot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
              >
                <Facebook size={18} className="text-blue-500" />
                Facebook
              </a>
              <a 
                href="mailto:support@knot.vn"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
              >
                <Mail size={18} className="text-red-400" />
                support@knot.vn
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs text-center md:text-left">
            {t('footer.copyright')}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-gray-400 text-xs uppercase tracking-wider transition-colors">
              {t('footer.about')}
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-400 text-xs uppercase tracking-wider transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-400 text-xs uppercase tracking-wider transition-colors">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
