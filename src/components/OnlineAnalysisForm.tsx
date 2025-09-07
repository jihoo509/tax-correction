import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { PrivacyPolicyDialog } from './PrivacyPolicyDialog';
import UtmHiddenFields from './UtmHiddenFields'; // ✨ 1. UTM 컴포넌트 불러오기

interface OnlineAnalysisFormProps {
  title?: string;
}

export function OnlineAnalysisForm({ title }: OnlineAnalysisFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDateFirst: '',
    birthDateSecond: '',
    gender: '',
    phoneNumber: '',
    agreedToTerms: false,
    companyName: '',
    businessNumber: '',
    isFirstStartup: '',
    hasPastClaim: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const birthDateFirstInputRef = useRef<HTMLInputElement>(null);
  const birthDateSecondInputRef = useRef<HTMLInputElement>(null);
  const phoneNumberInputRef = useRef<HTMLInputElement>(null);

  const handleInputFocus = (inputRef: React.RefObject<HTMLInputElement>) => {
    if (inputRef.current && window.innerWidth <= 768) {
      if (inputRef === birthDateFirstInputRef || inputRef === birthDateSecondInputRef) return;
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () =>
    setFormData({
      name: '',
      birthDateFirst: '',
      birthDateSecond: '',
      gender: '',
      phoneNumber: '',
      agreedToTerms: false,
      companyName: '',
      businessNumber: '',
      isFirstStartup: '',
      hasPastClaim: '',
    });

  // ✨ 2. event 타입을 HTMLFormElement로 바꿔줍니다.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // ✨ 3. 숨겨진 UTM 필드를 포함한 모든 폼 데이터를 읽어옵니다.
    const form = event.currentTarget;
    const formElements = Object.fromEntries(new FormData(form).entries());

    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));

    try {
      // ✨ 4. payload 생성 방식을 수정합니다.
      const payload = {
        type: 'online' as const,
        site: '경정청구',
        name: formData.name.trim(),
        phone: `010-${(formData.phoneNumber || '').trim()}`,
        rrnFront: formData.birthDateFirst.trim(),
        rrnBack: formData.birthDateSecond.trim(),
        gender: formData.gender as '남' | '여' | '',
        companyName: formData.companyName.trim(),
        businessNumber: formData.businessNumber.trim(),
        isFirstStartup: formData.isFirstStartup,
        hasPastClaim: formData.hasPastClaim,
        requestedAt: kstDate.toISOString(),

        // 읽어온 UTM 데이터를 payload에 합쳐줍니다.
        ...formElements
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `서버 오류(${res.status})`);
      }

      alert('✅ 온라인 분석 신청이 정상적으로 접수되었습니다!');
      resetForm();
    } catch (err: any) {
      console.error('온라인 분석 제출 오류:', err);
      alert('제출 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      <div
        className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20"
        style={{ boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.4)` }}
      >
        <div className="text-center space-y-1.5 mb-5">
          <p className="text-white text-[22px] md:text-2xl font-extrabold tracking-tight">
            AI 분석을 통해 예상 환급액을
          </p>
          <p className="text-[22px] md:text-2xl font-black bg-gradient-to-b from-[#FFB648] to-[#FF7A3D] bg-clip-text text-transparent">
            빠르고 간편하게 조회해 드립니다.
          </p>
          {title && <p className="mt-2 text-white/85 text-[13px] md:text-sm">{title}</p>}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* ✨ 5. 비밀 입력 칸(UTM 정보)을 폼 안에 추가합니다. */}
          <UtmHiddenFields />
          
          <div className="space-y-2">
            <label className="text-white text-base block">대표자 이름</label>
            <Input ref={nameInputRef} placeholder="대표자 성함을 입력" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} onFocus={() => handleInputFocus(nameInputRef)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500" required />
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">주민번호</label>
            <div className="flex space-x-2">
              <Input ref={birthDateFirstInputRef} placeholder="앞 6자리" value={formData.birthDateFirst} onChange={e => handleInputChange('birthDateFirst', e.target.value)} onFocus={() => handleInputFocus(birthDateFirstInputRef)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500 flex-1" maxLength={6} required />
              <span className="text-white text-2xl flex items-center">-</span>
              <Input ref={birthDateSecondInputRef} placeholder="뒤 7자리" type="password" value={formData.birthDateSecond} onChange={e => handleInputChange('birthDateSecond', e.target.value)} onFocus={() => handleInputFocus(birthDateSecondInputRef)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500 flex-1" maxLength={7} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">성별</label>
            <div className="flex h-12 bg-white rounded-md overflow-hidden">
                <Button type="button" onClick={() => handleInputChange('gender', '남')} className={`flex-1 flex items-center justify-center space-x-2 rounded-none h-full border-0 ${formData.gender === '남' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.gender === '남' ? 'bg-orange-400' : 'bg-gray-300'}`}>👨</div>
                    <span>남</span>
                </Button>
                <Button type="button" onClick={() => handleInputChange('gender', '여')} className={`flex-1 flex items-center justify-center space-x-2 rounded-none h-full border-0 ${formData.gender === '여' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.gender === '여' ? 'bg-orange-400' : 'bg-gray-300'}`}>👩</div>
                    <span>여</span>
                </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">전화번호</label>
            <div className="flex space-x-2">
              <div className="bg-white rounded-md px-3 py-3 text-gray-800 text-base w-16 text-center">010</div>
              <span className="text-white text-2xl flex items-center">-</span>
              <Input ref={phoneNumberInputRef} placeholder="휴대폰번호 8자리" value={formData.phoneNumber} onChange={e => handleInputChange('phoneNumber', e.target.value)} onFocus={() => handleInputFocus(phoneNumberInputRef)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500 flex-1" maxLength={8} required />
            </div>
          </div>

          <hr className="border-white/20 my-4" />

          <div className="space-y-2">
            <label className="text-white text-base block">사업자명</label>
            <Input placeholder="사업자명을 입력" value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500" required />
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">사업자번호</label>
            <Input placeholder="'-' 없이 10자리 입력" value={formData.businessNumber} onChange={e => handleInputChange('businessNumber', e.target.value)} className="bg-white border-0 h-12 text-gray-800 placeholder:text-gray-500" maxLength={10} required />
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">최초 창업 여부</label>
            <div className="flex h-12 bg-white rounded-md overflow-hidden">
              <Button type="button" onClick={() => handleInputChange('isFirstStartup', '예')} className={`flex-1 rounded-none h-full border-0 ${formData.isFirstStartup === '예' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>예</Button>
              <Button type="button" onClick={() => handleInputChange('isFirstStartup', '아니오')} className={`flex-1 rounded-none h-full border-0 ${formData.isFirstStartup === '아니오' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>아니오</Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-white text-base block">과거 경정청구 진행 여부</label>
            <div className="flex h-12 bg-white rounded-md overflow-hidden">
              <Button type="button" onClick={() => handleInputChange('hasPastClaim', '예')} className={`flex-1 rounded-none h-full border-0 ${formData.hasPastClaim === '예' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>예</Button>
              <Button type="button" onClick={() => handleInputChange('hasPastClaim', '아니오')} className={`flex-1 rounded-none h-full border-0 ${formData.hasPastClaim === '아니오' ? 'bg-[#f59e0b] text-white' : 'bg-white text-gray-600'}`}>아니오</Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="online-terms-agreement" checked={formData.agreedToTerms} onCheckedChange={checked => handleInputChange('agreedToTerms', !!checked)} className="border-white data-[state=checked]:bg-[#f59e0b]" />
              <label htmlFor="online-terms-agreement" className="text-white text-base cursor-pointer">개인정보 수집 및 이용동의</label>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPrivacyDialog(true)} className="bg-white text-gray-800 border-white">자세히 보기</Button>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={!formData.name || !formData.birthDateFirst || !formData.birthDateSecond || !formData.gender || !formData.phoneNumber || !formData.companyName || !formData.businessNumber || !formData.isFirstStartup || !formData.hasPastClaim || !formData.agreedToTerms || isSubmitting} className="w-full h-14 bg-[#f59e0b] hover:bg-[#d97706] text-white text-xl disabled:opacity-50">
              {isSubmitting ? '신청 중...' : '온라인분석 신청하기'}
            </Button>
          </div>
        </form>
      </div>
      <PrivacyPolicyDialog
  isOpen={showPrivacyDialog}
  onClose={() => setShowPrivacyDialog(false)}
  onAgree={() => handleInputChange('agreedToTerms', true)}
/>
    </div>
  );
}

