'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { User, FileText, Camera, CheckCircle, Upload, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const steps = [
  { id: 1, title: 'Persoonlijke gegevens', icon: User },
  { id: 2, title: 'Document uploaden', icon: FileText },
  { id: 3, title: 'Selfie verificatie', icon: Camera },
  { id: 4, title: 'Verificatie afgerond', icon: CheckCircle },
]

export default function KYCPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [personalData, setPersonalData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'NL',
  })
  const [docType, setDocType] = useState<'passport' | 'id_card' | 'drivers_license'>('id_card')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)

  const handlePersonalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentStep(2)
  }

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile) { toast.error('Upload een document'); return }
    setCurrentStep(3)
  }

  const handleSelfieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selfieFile) { toast.error('Upload een selfie'); return }
    setIsSubmitting(true)
    // Mock API call
    await new Promise(r => setTimeout(r, 2000))
    setIsSubmitting(false)
    setCurrentStep(4)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-black mb-2 text-center">Identiteitsverificatie</h1>
      <p className="text-gray-400 text-sm mb-8 text-center">Vereist voor deelname met echt geld</p>

      {/* Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                currentStep > step.id ? 'bg-[#00FF87] border-[#00FF87]' :
                currentStep === step.id ? 'border-[#00FF87] text-[#00FF87]' :
                'border-[#1E2A45] text-gray-600'
              }`}>
                {currentStep > step.id
                  ? <CheckCircle className="w-5 h-5 text-[#0A0E1A]" />
                  : <step.icon className="w-5 h-5" />
                }
              </div>
              <span className="text-xs text-gray-500 hidden sm:block text-center w-20">{step.title}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-[#00FF87]' : 'bg-[#1E2A45]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal data */}
          {currentStep === 1 && (
            <motion.form key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handlePersonalSubmit} className="space-y-4">
              <h2 className="font-bold text-lg mb-4">Persoonlijke gegevens</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'first_name', label: 'Voornaam', placeholder: 'Jan' },
                  { key: 'last_name', label: 'Achternaam', placeholder: 'De Vries' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-400 mb-1">{label}</label>
                    <input
                      required
                      type="text"
                      placeholder={placeholder}
                      value={personalData[key as keyof typeof personalData]}
                      onChange={e => setPersonalData(d => ({ ...d, [key]: e.target.value }))}
                      className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-sm"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Geboortedatum</label>
                <input required type="date" value={personalData.date_of_birth} onChange={e => setPersonalData(d => ({ ...d, date_of_birth: e.target.value }))} className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#00FF87] text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nationaliteit</label>
                <select value={personalData.nationality} onChange={e => setPersonalData(d => ({ ...d, nationality: e.target.value }))} className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#00FF87] text-sm">
                  <option value="">Selecteer nationaliteit</option>
                  <option value="NL">Nederlands</option>
                  <option value="BE">Belgisch</option>
                  <option value="DE">Duits</option>
                  <option value="FR">Frans</option>
                  <option value="GB">Brits</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Adres</label>
                <input required type="text" placeholder="Straat 123" value={personalData.address} onChange={e => setPersonalData(d => ({ ...d, address: e.target.value }))} className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Stad</label>
                  <input required type="text" placeholder="Amsterdam" value={personalData.city} onChange={e => setPersonalData(d => ({ ...d, city: e.target.value }))} className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Postcode</label>
                  <input required type="text" placeholder="1234 AB" value={personalData.postal_code} onChange={e => setPersonalData(d => ({ ...d, postal_code: e.target.value }))} className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00CC6A] transition-colors mt-2">
                Volgende stap <ChevronRight className="w-4 h-4" />
              </button>
            </motion.form>
          )}

          {/* Step 2: Document */}
          {currentStep === 2 && (
            <motion.form key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleDocSubmit} className="space-y-4">
              <h2 className="font-bold text-lg mb-4">Document uploaden</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type document</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['id_card', 'passport', 'drivers_license'] as const).map((type) => (
                    <button key={type} type="button" onClick={() => setDocType(type)} className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${docType === type ? 'border-[#00FF87] bg-[#00FF87]/10 text-[#00FF87]' : 'border-[#1E2A45] text-gray-400 hover:border-[#00FF87]/30'}`}>
                      {type === 'id_card' ? 'ID-kaart' : type === 'passport' ? 'Paspoort' : 'Rijbewijs'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Document foto (voor- en achterkant)</label>
                <label className="w-full h-36 border-2 border-dashed border-[#1E2A45] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00FF87]/50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-600 mb-2" />
                  <span className="text-sm text-gray-500">{docFile ? docFile.name : 'Klik om bestand te uploaden'}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <button type="submit" className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00CC6A] transition-colors">
                Volgende stap <ChevronRight className="w-4 h-4" />
              </button>
            </motion.form>
          )}

          {/* Step 3: Selfie */}
          {currentStep === 3 && (
            <motion.form key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSelfieSubmit} className="space-y-4">
              <h2 className="font-bold text-lg mb-4">Selfie verificatie</h2>
              <p className="text-sm text-gray-400">Maak een selfie waarbij je je ID-document naast je gezicht houdt.</p>
              <label className="w-full h-48 border-2 border-dashed border-[#1E2A45] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#00FF87]/50 transition-colors">
                <Camera className="w-10 h-10 text-gray-600 mb-3" />
                <span className="text-sm text-gray-500">{selfieFile ? selfieFile.name : 'Upload selfie met document'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00CC6A] transition-colors disabled:opacity-50">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-[#0A0E1A] border-t-transparent rounded-full animate-spin" /> : <>Verificatie sturen <ChevronRight className="w-4 h-4" /></>}
              </button>
            </motion.form>
          )}

          {/* Step 4: Done */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 bg-[#00FF87]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#00FF87]" />
              </div>
              <h2 className="text-xl font-bold mb-2">Verificatie ingediend!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Je documenten worden binnen 24 uur beoordeeld. Je ontvangt een e-mail zodra je account is geverifieerd.
              </p>
              <button onClick={() => router.push('/dashboard')} className="bg-[#00FF87] text-[#0A0E1A] px-8 py-3 rounded-xl font-bold hover:bg-[#00CC6A] transition-colors">
                Naar dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
