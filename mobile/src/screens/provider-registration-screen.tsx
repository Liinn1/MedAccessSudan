import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import { KeyboardAwareForm } from '@/components/forms/keyboard-aware-form'
import { SearchableOptionSelector } from '@/components/forms/searchable-option-selector'
import { AppText as Text, AppTextInput as TextInput } from '@/components/app-text'
import { LanguageToggle } from '@/components/language-toggle'
import { MaterialIcon } from '@/components/material-icon'
import { PasswordVisibilityButton } from '@/components/password-visibility-button'
import { useAppLanguage } from '@/hooks/use-app-language'
import { getRegistrationOptions, registerDoctor, registerLaboratory, resendEmailVerification, type MobileImageFile, type RegistrationOption } from '@/services/auth-service'
import { colors, radii, spacing } from '@/theme/tokens'
import { arabicFonts } from '@/theme/typography'

type Role = 'doctor' | 'laboratory'
type Values = Record<string, string | boolean>
type ProviderField = 'first_name' | 'last_name' | 'laboratory_name' | 'email' | 'phone' | 'password' | 'password_confirmation' | 'specialization' | 'location' | 'address' | 'service_mode' | 'profile_photo'
type FieldErrors = Partial<Record<ProviderField, string>>
const accountDefaults = { first_name: '', last_name: '', laboratory_name: '', email: '', phone: '', password: '', password_confirmation: '' }
const acceptedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp']
const maximumPhotoBytes = 3 * 1024 * 1024

export function ProviderRegistrationScreen({ role }: { role: Role }) {
  const router = useRouter(); const { t } = useTranslation(); const { language, isRTL, shouldMirrorLayout } = useAppLanguage()
  const [step, setStep] = useState<1 | 2>(1); const [values, setValues] = useState<Values>({ ...accountDefaults, specialization: '', location: '', clinic_name: '', address: '', offers_clinic_visits: true, offers_home_visits: false, supports_at_lab: true, supports_home_collection: false })
  const [options, setOptions] = useState<{ specializations: RegistrationOption[]; locations: RegistrationOption[] }>({ specializations: [], locations: [] })
  const [photo, setPhoto] = useState<MobileImageFile | undefined>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [fieldErrors, setFieldErrors] = useState<FieldErrors>({}); const [success, setSuccess] = useState<{ email: string; verificationEmailSent: boolean } | null>(null)
  const direction = isRTL ? styles.rtl : styles.ltr
  useEffect(() => { let active = true; void getRegistrationOptions().then((data) => { if (active) setOptions(data) }).catch(() => { if (active) setError(t('auth.provider.errors.options')) }); return () => { active = false } }, [t])
  const set = (key: string, value: string | boolean) => { setValues((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: undefined, ...(key === 'offers_clinic_visits' || key === 'offers_home_visits' || key === 'supports_at_lab' || key === 'supports_home_collection' ? { service_mode: undefined } : {}) })); setError('') }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { setFieldErrors((current) => ({ ...current, profile_photo: t('auth.provider.errors.photoPermission') })); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .8 })
    if (!result.canceled) { const asset = result.assets[0]; const type = asset.mimeType || 'image/jpeg'; if (!acceptedPhotoTypes.includes(type) || (asset.fileSize != null && asset.fileSize > maximumPhotoBytes)) { setFieldErrors((current) => ({ ...current, profile_photo: t('auth.provider.errors.photo') })); return } setPhoto({ uri: asset.uri, name: asset.fileName || `${role}-profile.jpg`, type }); setFieldErrors((current) => ({ ...current, profile_photo: undefined })) }
  }
  function validateAccount(): FieldErrors {
    const next: FieldErrors = {}
    if (role === 'doctor') {
      if (!String(values.first_name).trim()) next.first_name = t('auth.register.errors.required')
      if (!String(values.last_name).trim()) next.last_name = t('auth.register.errors.required')
    } else if (!String(values.laboratory_name).trim()) next.laboratory_name = t('auth.register.errors.required')
    if (!/^\S+@\S+\.\S+$/.test(String(values.email).trim())) next.email = t('auth.register.errors.email')
    if (!/^\+?[0-9]{7,15}$/.test(String(values.phone).replace(/[\s()-]/g, ''))) next.phone = t('auth.register.errors.phone')
    if (String(values.password).length < 8 || !/[A-Za-z]/.test(String(values.password)) || !/\d/.test(String(values.password))) next.password = t('auth.register.errors.password')
    if (!values.password_confirmation || values.password !== values.password_confirmation) next.password_confirmation = t('auth.register.errors.confirmation')
    return next
  }
  function validateProvider(): FieldErrors {
    const next: FieldErrors = {}
    if (!values.location) next.location = t('auth.provider.errors.location')
    if (String(values.address).trim().length < 4) next.address = t('auth.provider.errors.address')
    if (role === 'doctor') {
      if (!values.specialization) next.specialization = t('auth.provider.errors.specialization')
      if (!photo) next.profile_photo = t('auth.provider.errors.photo')
      if (!values.offers_clinic_visits && !values.offers_home_visits) next.service_mode = t('auth.provider.errors.serviceMode')
    } else if (!values.supports_at_lab && !values.supports_home_collection) next.service_mode = t('auth.provider.errors.serviceMode')
    return next
  }
  async function submit() {
    if (busy) return
    const nextErrors = validateProvider()
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); setError(t('auth.register.errors.correctFields')); return }
    setBusy(true); setError('')
    try {
      const result = role === 'doctor'
        ? await registerDoctor({ first_name: String(values.first_name).trim(), last_name: String(values.last_name).trim(), email: String(values.email).trim(), phone: String(values.phone).trim(), password: String(values.password), password_confirmation: String(values.password_confirmation), specialization: String(values.specialization), location: String(values.location), address: String(values.address).trim(), clinic_name: String(values.clinic_name) || undefined, offers_clinic_visits: Boolean(values.offers_clinic_visits), offers_home_visits: Boolean(values.offers_home_visits), profile_photo: photo! })
        : await registerLaboratory({ laboratory_name: String(values.laboratory_name).trim(), email: String(values.email).trim(), phone: String(values.phone).trim(), password: String(values.password), password_confirmation: String(values.password_confirmation), location: String(values.location), address: String(values.address).trim(), supports_at_lab: Boolean(values.supports_at_lab), supports_home_collection: Boolean(values.supports_home_collection), profile_photo: photo })
      setSuccess({ email: String(values.email).trim(), verificationEmailSent: result.verificationEmailSent })
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        const fields = cause.validationErrors ?? {}
        setFieldErrors({
          first_name: fields.first_name ? t('auth.register.errors.invalid') : undefined,
          last_name: fields.last_name ? t('auth.register.errors.invalid') : undefined,
          laboratory_name: fields.laboratory_name ? t('auth.register.errors.invalid') : undefined,
          email: fields.email ? t(cause.validationCodes?.email?.includes('unique') ? 'auth.register.errors.emailExists' : 'auth.register.errors.email') : undefined,
          phone: fields.phone ? t('auth.register.errors.phoneExists') : undefined,
          password: fields.password ? t('auth.register.errors.passwordRejected') : undefined,
          password_confirmation: fields.password_confirmation ? t('auth.register.errors.passwordRejected') : undefined,
          profile_photo: fields.profile_photo ? t('auth.provider.errors.photo') : undefined,
          location: fields.location ? t('auth.provider.errors.location') : undefined,
          address: fields.address ? t('auth.provider.errors.address') : undefined,
          specialization: fields.specialization ? t('auth.provider.errors.specialization') : undefined,
          service_mode: fields.offers_clinic_visits || fields.offers_home_visits || fields.supports_at_lab || fields.supports_home_collection ? t('auth.provider.errors.serviceMode') : undefined,
        })
        setError(t('auth.provider.errors.validation'))
        if (fields.first_name || fields.last_name || fields.laboratory_name || fields.email || fields.phone || fields.password || fields.password_confirmation) setStep(1)
      } else if (cause instanceof ApiError && cause.status === 429) setError(t('auth.register.errors.tooMany'))
      else if (cause instanceof ApiError && cause.code === 'network') setError(t('auth.register.errors.network'))
      else setError(t('auth.register.errors.unavailable'))
    }
    finally { setBusy(false) }
  }
  if (success) return <RegistrationSuccess email={success.email} emailSent={success.verificationEmailSent} role={role} />
  return <KeyboardAwareForm contentContainerStyle={styles.content} key={step} safeAreaStyle={styles.safeArea}>
    <View style={[styles.top, shouldMirrorLayout && styles.reverse]}><Pressable onPress={() => step === 2 ? setStep(1) : router.back()}><MaterialIcon name={isRTL ? 'arrow_forward' : 'arrow_back'} /></Pressable><LanguageToggle compact /></View>
    <Text style={[styles.step, direction, isRTL && arabicFonts.semiBold]}>{t('auth.provider.step', { current: step })}</Text><Text style={[styles.title, direction, isRTL && arabicFonts.extraBold]}>{t(`auth.provider.${role}.title`)}</Text>
    {step === 1 ? <View style={styles.form}>
      {role === 'doctor' ? <><Field error={fieldErrors.first_name} label={t('auth.register.firstName')} name="first_name" set={set} value={values.first_name} /><Field error={fieldErrors.last_name} label={t('auth.register.lastName')} name="last_name" set={set} value={values.last_name} /></> : <Field error={fieldErrors.laboratory_name} label={t('auth.provider.labName')} name="laboratory_name" set={set} value={values.laboratory_name} />}
      <Field error={fieldErrors.email} keyboard="email-address" label={t('auth.register.email')} name="email" set={set} value={values.email} /><Field error={fieldErrors.phone} keyboard="phone-pad" label={t('auth.register.phone')} name="phone" set={set} value={values.phone} />
      <Field error={fieldErrors.password} password label={t('auth.register.password')} name="password" set={set} value={values.password} /><Field error={fieldErrors.password_confirmation} password label={t('auth.register.confirmPassword')} name="password_confirmation" set={set} value={values.password_confirmation} />
      {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, direction, isRTL && arabicFonts.regular]}>{error}</Text>}<Primary label={t('auth.provider.continue')} onPress={() => { const nextErrors = validateAccount(); setFieldErrors(nextErrors); if (Object.keys(nextErrors).length === 0) { setError(''); setStep(2) } else setError(t('auth.register.errors.correctFields')) }} />
    </View> : <View style={styles.form}>
      {role === 'doctor' && <OptionGroup error={fieldErrors.specialization} label={t('auth.provider.specialization')} language={language} options={options.specializations} selected={String(values.specialization)} set={(value) => set('specialization', value)} />}
      <SearchableOptionSelector error={fieldErrors.location} label={t('auth.provider.state')} onChange={(value) => set('location', value)} options={options.locations} placeholder={t('auth.provider.selectState')} searchPlaceholder={t('auth.provider.searchState')} value={String(values.location)} />
      <Field error={fieldErrors.address} label={t('auth.provider.address')} multiline name="address" set={set} value={values.address} />
      {role === 'doctor' && <Field label={t('auth.provider.clinicName')} name="clinic_name" set={set} value={values.clinic_name} />}
      {role === 'doctor' ? <><Toggle checked={Boolean(values.offers_clinic_visits)} label={t('auth.provider.clinicVisits')} onPress={() => set('offers_clinic_visits', !values.offers_clinic_visits)} /><Toggle checked={Boolean(values.offers_home_visits)} label={t('auth.provider.homeVisits')} onPress={() => set('offers_home_visits', !values.offers_home_visits)} /></> : <><Toggle checked={Boolean(values.supports_at_lab)} label={t('auth.provider.atLab')} onPress={() => set('supports_at_lab', !values.supports_at_lab)} /><Toggle checked={Boolean(values.supports_home_collection)} label={t('auth.provider.homeCollection')} onPress={() => set('supports_home_collection', !values.supports_home_collection)} /></>}
      {!!fieldErrors.service_mode && <Text style={[styles.fieldError, direction]}>{fieldErrors.service_mode}</Text>}
      <Pressable accessibilityRole="button" onPress={() => void choosePhoto()} style={[styles.photo, fieldErrors.profile_photo && styles.inputError]}>{photo ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : <MaterialIcon color={colors.primary} name="add_a_photo" size={28} />}<Text style={[styles.photoText, isRTL && arabicFonts.semiBold]}>{t(role === 'doctor' ? 'auth.provider.photoRequired' : 'auth.provider.photoOptional')}</Text></Pressable>
      {!!fieldErrors.profile_photo && <Text style={[styles.fieldError, direction]}>{fieldErrors.profile_photo}</Text>}
      {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, direction, isRTL && arabicFonts.regular]}>{error}</Text>}<Primary busy={busy} label={busy ? t('auth.register.submitting') : t('auth.register.submit')} onPress={() => void submit()} />
    </View>}
  </KeyboardAwareForm>
}

function Field({ error, keyboard='default', label, multiline=false, name, password=false, set, value }: { error?:string; keyboard?: 'default'|'email-address'|'phone-pad'; label:string; multiline?:boolean; name:string; password?:boolean; set:(key:string,value:string)=>void; value:string|boolean }) { const {isRTL}=useAppLanguage(); const [visible,setVisible]=useState(false); const direction=isRTL?styles.rtl:styles.ltr; return <View><Text style={[styles.label,direction,isRTL&&arabicFonts.bold]}>{label}</Text>{password?<View style={[styles.passwordField,error&&styles.inputError]}><TextInput autoCapitalize="none" autoComplete="new-password" autoCorrect={false} onChangeText={(text)=>set(name,text)} secureTextEntry={!visible} style={[styles.passwordInput,direction,isRTL&&arabicFonts.regular]} value={String(value)} /><PasswordVisibilityButton onPress={()=>setVisible((current)=>!current)} visible={visible} /></View>:<TextInput autoCapitalize={keyboard==='email-address'?'none':'sentences'} autoCorrect={keyboard!=='email-address'} keyboardType={keyboard} multiline={multiline} onChangeText={(text)=>set(name,text)} style={[styles.input,multiline&&styles.multiline,direction,isRTL&&arabicFonts.regular,error&&styles.inputError]} textAlignVertical={multiline?'top':'center'} value={String(value)} />}{!!error&&<Text accessibilityLiveRegion="polite" style={[styles.fieldError,direction,isRTL&&arabicFonts.regular]}>{error}</Text>}</View> }
function OptionGroup({error,label,language,options,selected,set}:{error?:string;label:string;language:string;options:RegistrationOption[];selected:string;set:(value:string)=>void}) { const {isRTL}=useAppLanguage(); return <View><Text style={[styles.label,isRTL&&styles.rtl,isRTL&&arabicFonts.bold]}>{label}</Text><View style={styles.chips}>{options.map((option)=><Pressable accessibilityRole="button" key={option.code} onPress={()=>set(option.code)} style={[styles.chip,selected===option.code&&styles.chipSelected]}><Text style={[styles.chipText,selected===option.code&&styles.chipTextSelected,isRTL&&arabicFonts.medium]}>{language==='ar'?option.name_ar:option.name_en}</Text></Pressable>)}</View>{!!error&&<Text style={[styles.fieldError,isRTL&&styles.rtl]}>{error}</Text>}</View> }
function Toggle({checked,label,onPress}:{checked:boolean;label:string;onPress:()=>void}) { const {isRTL}=useAppLanguage(); return <Pressable onPress={onPress} style={styles.toggle}><MaterialIcon color={checked?colors.primary:colors.textMuted} name={checked?'check_box':'check_box_outline_blank'} /><Text style={[styles.toggleText,isRTL&&arabicFonts.regular]}>{label}</Text></Pressable> }
function Primary({busy=false,label,onPress}:{busy?:boolean;label:string;onPress:()=>void}) { const {isRTL}=useAppLanguage(); return <Pressable disabled={busy} onPress={onPress} style={({pressed})=>[styles.primary,(pressed||busy)&&styles.pressed]}><Text style={[styles.primaryText,isRTL&&arabicFonts.bold]}>{label}</Text></Pressable> }
function RegistrationSuccess({email,emailSent,role}:{email:string;emailSent:boolean;role:Role}) { const router=useRouter(); const {t}=useTranslation(); const {isRTL}=useAppLanguage(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const direction=isRTL?styles.rtl:styles.ltr; return <SafeAreaView edges={['top','right','bottom','left']} style={styles.safeArea}><View style={styles.success}><View style={styles.successIcon}><MaterialIcon color={colors.white} name="check" size={54}/></View><Text style={[styles.successTitle,direction,isRTL&&arabicFonts.extraBold]}>{t('auth.provider.successTitle')}</Text><Text style={[styles.successDescription,direction,isRTL&&arabicFonts.regular]}>{t(emailSent?`auth.provider.${role}.success`:'auth.register.deliveryFailed')}</Text>{!!message&&<Text accessibilityLiveRegion="polite" style={[styles.verificationMessage,direction,isRTL&&arabicFonts.regular]}>{message}</Text>}<Primary busy={busy} label={busy?t('auth.register.submitting'):t('auth.register.resendVerification')} onPress={()=>{if(busy)return;setBusy(true);setMessage('');void resendEmailVerification(email).then(()=>setMessage(t('auth.register.verificationResent'))).catch(()=>setMessage(t('auth.register.errors.verificationUnavailable'))).finally(()=>setBusy(false))}}/><Primary label={t('auth.register.goToLogin')} onPress={()=>router.replace('/login')}/></View></SafeAreaView> }

const styles=StyleSheet.create({safeArea:{backgroundColor:colors.background,flex:1},content:{padding:spacing.lg},top:{alignItems:'center',flexDirection:'row',justifyContent:'space-between'},reverse:{flexDirection:'row-reverse'},step:{color:colors.primary,fontSize:13,marginTop:spacing.lg},title:{color:colors.textPrimary,fontSize:28,fontWeight:'800',lineHeight:38,marginTop:4},form:{gap:spacing.sm,marginTop:spacing.md},label:{color:colors.textPrimary,fontSize:13,fontWeight:'700',marginTop:spacing.xs},input:{backgroundColor:colors.white,borderColor:colors.border,borderRadius:radii.md,borderWidth:1,color:colors.textPrimary,fontSize:15,minHeight:50,paddingHorizontal:spacing.md},multiline:{minHeight:92,paddingVertical:spacing.md},inputError:{borderColor:colors.danger},fieldError:{color:colors.danger,fontSize:12,lineHeight:18,marginTop:3},passwordField:{alignItems:'center',backgroundColor:colors.white,borderColor:colors.border,borderRadius:radii.md,borderWidth:1,flexDirection:'row'},passwordInput:{color:colors.textPrimary,flex:1,fontSize:15,minHeight:48,paddingHorizontal:spacing.md},error:{color:colors.danger,fontSize:13,lineHeight:20},primary:{alignItems:'center',backgroundColor:colors.primary,borderRadius:radii.md,justifyContent:'center',marginTop:spacing.sm,minHeight:52},primaryText:{color:colors.white,fontSize:15,fontWeight:'700'},pressed:{opacity:.7},chips:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:6},chip:{backgroundColor:colors.white,borderColor:colors.border,borderRadius:radii.pill,borderWidth:1,paddingHorizontal:12,paddingVertical:8},chipSelected:{backgroundColor:colors.primarySurface,borderColor:colors.primary},chipText:{color:colors.textSecondary,fontSize:12},chipTextSelected:{color:colors.primary},toggle:{alignItems:'center',flexDirection:'row',gap:8,minHeight:42},toggleText:{color:colors.textPrimary,fontSize:14},photo:{alignItems:'center',backgroundColor:colors.primarySurface,borderColor:colors.primary,borderRadius:radii.md,borderStyle:'dashed',borderWidth:1,gap:8,justifyContent:'center',minHeight:100,padding:spacing.md},photoPreview:{borderRadius:radii.pill,height:62,width:62},photoText:{color:colors.primary,fontSize:13},success:{flex:1,justifyContent:'center',padding:spacing.lg},successIcon:{alignItems:'center',alignSelf:'center',backgroundColor:colors.primary,borderRadius:radii.pill,height:96,justifyContent:'center',width:96},successTitle:{color:colors.textPrimary,fontSize:28,fontWeight:'800',lineHeight:38,marginTop:spacing.xl,textAlign:'center'},successDescription:{color:colors.textSecondary,fontSize:15,lineHeight:24,marginTop:spacing.sm,textAlign:'center'},verificationMessage:{color:colors.primary,fontSize:13,lineHeight:20,marginTop:spacing.sm,textAlign:'center'},ltr:{textAlign:'left',writingDirection:'ltr'},rtl:{textAlign:'right',writingDirection:'rtl'}})
