import React, { useState, useRef } from 'react';
import { MapPin, Camera, Image as ImageIcon, Send, AlertCircle, CheckCircle2, User, Mail, Hash, FileText, Map, HelpCircle, Phone, Share2 } from 'lucide-react';
import { pincodeData } from './pincodeData';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    pincode: '',
    locationName: '',
    problemType: '',
    complaint: '',
  });
  const [availableLocations, setAvailableLocations] = useState([]);
  const [pincodeError, setPincodeError] = useState('');
  
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationRequiredError, setLocationRequiredError] = useState(false);
  
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const fileInputRef = useRef(null);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'সুকান্তকে জানান | আপনার সমস্যা, আমাদের দায়িত্ব',
          text: 'আপনার সমস্যার কথা সরাসরি জানান। আমরা আপনার অভিযোগ শুনতে এবং দ্রুত সমাধান করতে প্রস্তুত।',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
      alert('লিঙ্ক কপি করা হয়েছে! (Link copied to clipboard)');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePincodeChange = (e) => {
    const code = e.target.value;
    setFormData(prev => ({ ...prev, pincode: code }));
    
    if (code.length === 6) {
      if (pincodeData[code]) {
        setAvailableLocations(pincodeData[code]);
        setFormData(prev => ({ ...prev, locationName: pincodeData[code][0] })); // Auto-select the first one
        setPincodeError('');
      } else {
        setAvailableLocations([]);
        setFormData(prev => ({ ...prev, locationName: '' }));
        setPincodeError('দুঃখিত, এই পিন কোডটি আমাদের এলাকার/নির্বাচনী ক্ষেত্রের বাইরে। (Out of area or constituency)');
      }
    } else {
      setAvailableLocations([]);
      setFormData(prev => ({ ...prev, locationName: '' }));
      setPincodeError('');
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const fetchLocation = () => {
    setLocationLoading(true);
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            setLocation({
              lat: latitude,
              lng: longitude,
              address: data.display_name,
            });
            setLocationRequiredError(false);
          } catch (error) {
            setLocationError('ঠিকানা পেতে সমস্যা হয়েছে। (Failed to fetch address details.)');
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          setLocationError('অবস্থান অ্যাক্সেস অস্বীকার করা হয়েছে বা অনুপলব্ধ। (Location access denied.)');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('আপনার ব্রাউজার জিওলোকেশন সমর্থন করে না। (Geolocation not supported.)');
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!location) {
      setLocationRequiredError(true);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    setLocationRequiredError(false);

    const form = new FormData();
    form.append('access_key', import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE');
    form.append('subject', `নতুন অভিযোগ: ${formData.name}`);
    form.append('from_name', 'সুকান্তকে জানান পোর্টাল');
    form.append('replyto', formData.email);
    
    form.append('নাম (Name)', formData.name);
    form.append('ফোন নম্বর (Phone)', formData.phone);
    form.append('ইমেইল (Email)', formData.email);
    form.append('পিন কোড (Pincode)', formData.pincode);
    if (formData.locationName) {
      form.append('এলাকা (Area)', formData.locationName);
    }
    if (formData.problemType) {
      form.append('সমস্যার ধরন (Problem Type)', formData.problemType);
    }
    form.append('অভিযোগ (Complaint)', formData.complaint);
    
    if (location) {
      form.append('অবস্থান_ঠিকানা (Location Address)', location.address);
      form.append('গুগল_ম্যাপস_লিঙ্ক (Google Maps Link)', `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`);
    }

    // Add multiple images (Note: Web3Forms free tier might restrict multiple attachments, 
    // but we will send them as attachment1, attachment2, etc.)
    images.forEach((img, index) => {
      form.append(`attachment_${index + 1}`, img.file);
    });

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: form
      });
      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setFormData({ name: '', phone: '', email: '', pincode: '', locationName: '', problemType: '', complaint: '' });
        setLocation(null);
        setImages([]);
        setAvailableLocations([]);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ambient flex items-center justify-center p-4 sm:p-8 font-sans text-slate-800">
      <div className="w-full max-w-2xl">
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Banner Image */}
          <div className="relative w-full bg-white group">
            <img 
              src="/banner.jpg" 
              alt="Inform Sukanta Banner" 
              className="w-full h-auto object-cover"
            />
            {/* Share Button Overlay */}
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/80 backdrop-blur-md hover:bg-white text-slate-800 p-2 sm:p-2.5 rounded-full shadow-lg border border-white/50 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
            >
              <Share2 className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-bold hidden sm:block pr-1 text-orange-700">শেয়ার করুন</span>
            </button>
            
            {/* Saffron accent line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-green-600"></div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {submitStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">অভিযোগ সফলভাবে জমা হয়েছে!</h4>
                  <p className="text-sm mt-1">আমাদের জানানোর জন্য ধন্যবাদ। আমরা অবিলম্বে এই বিষয়টি খতিয়ে দেখব।</p>
                </div>
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">জমা দেওয়া ব্যর্থ হয়েছে</h4>
                  <p className="text-sm mt-1">আপনার অভিযোগ পাঠানোর সময় একটি ত্রুটি হয়েছে৷ অনুগ্রহ করে পরে আবার চেষ্টা করুন৷</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" /> সম্পূর্ণ নাম (Full Name)
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="যেমন: রাহুল শর্মা"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500" /> ফোন নম্বর (Phone)
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength="10"
                  pattern="[0-9]{10}"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="যেমন: 9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-500" /> ইমেইল ঠিকানা (Email)
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="আপনার@ইমেইল.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-500" /> পিন কোড (Pin Code)
                </label>
                <input
                  type="text"
                  name="pincode"
                  required
                  maxLength="6"
                  pattern="[0-9]{6}"
                  value={formData.pincode}
                  onChange={handlePincodeChange}
                  placeholder="যেমন: ৭০০০০১"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
                {pincodeError && <p className="text-xs text-red-500 mt-1">{pincodeError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Map className="w-4 h-4 text-orange-500" /> এলাকা নির্বাচন করুন (Select Area)
                </label>
                <select
                  name="locationName"
                  required
                  disabled={availableLocations.length === 0}
                  value={formData.locationName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50 disabled:opacity-50 disabled:bg-slate-100"
                >
                  {availableLocations.length === 0 ? (
                    <option value="">প্রথমে পিন কোড দিন</option>
                  ) : (
                    availableLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-500" /> সমস্যার ধরন (Problem Type)
              </label>
              <select
                name="problemType"
                required
                value={formData.problemType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
              >
                <option value="">সমস্যা নির্বাচন করুন (Select Problem)</option>
                <option value="ভাঙা রাস্তা (Broken Road)">ভাঙা রাস্তা (Broken Road)</option>
                <option value="জল জমা (Water Logging)">জল জমা (Water Logging)</option>
                <option value="নষ্ট ড্রেনেজ (Damaged Drainage)">নষ্ট ড্রেনেজ (Damaged Drainage)</option>
                <option value="পানীয় জলের সমস্যা (Drinking Water Problem)">পানীয় জলের সমস্যা (Drinking Water Problem)</option>
                <option value="আলো ও বিদ্যুতের সমস্যা (Street Light & Electricity)">আলো ও বিদ্যুতের সমস্যা (Street Light & Electricity)</option>
                <option value="আবর্জনা পরিষ্কার (Garbage Cleaning)">আবর্জনা পরিষ্কার (Garbage Cleaning)</option>
                <option value="অন্যান্য (Other)">অন্যান্য (Other)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" /> বিস্তারিত অভিযোগ (Complaint)
              </label>
              <textarea
                name="complaint"
                required
                rows="4"
                value={formData.complaint}
                onChange={handleInputChange}
                placeholder="দয়া করে আপনার সমস্যার বিস্তারিত বিবরণ দিন..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50 resize-none"
              ></textarea>
            </div>

            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" /> লাইভ অবস্থান (Live Location) <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">সমস্যা চিহ্নিত করতে আপনার বর্তমান অবস্থান প্রদান করুন।</p>
                </div>
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={locationLoading}
                  className={`px-4 py-2 bg-white border ${locationRequiredError ? 'border-red-500 text-red-600' : 'border-slate-300 text-slate-700'} rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {locationLoading ? (
                    <span className="animate-pulse">খোঁজা হচ্ছে...</span>
                  ) : (
                    <>আমার অবস্থান খুঁজুন</>
                  )}
                </button>
              </div>
              
              {locationError && <p className="text-xs text-red-500">{locationError}</p>}
              {locationRequiredError && !location && (
                <p className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200 mt-2">
                  <AlertCircle className="w-4 h-4 inline mr-1 -mt-0.5" /> অভিযোগ জমা দেওয়ার আগে আপনার অবস্থান প্রদান করা বাধ্যতামূলক।
                </p>
              )}
              
              {location && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-slate-700">
                  <p><span className="font-semibold text-orange-800">ঠিকানা:</span> {location.address}</p>
                  <p className="text-xs text-slate-500 mt-1">অক্ষাংশ: {location.lat.toFixed(4)}, দ্রাঘিমাংশ: {location.lng.toFixed(4)}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-orange-500" /> একাধিক ছবির প্রমাণ (Multiple Photos)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">সমস্যার একাধিক ছবি আপলোড করতে পারেন।</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" /> ছবি নির্বাচন করুন
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={img.preview} alt={`Preview ${index}`} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-lg"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">জমা দেওয়া হচ্ছে...</span>
                ) : (
                  <>
                    অভিযোগ জমা দিন <Send className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                জমা দেওয়ার মাধ্যমে, আপনি সম্মত হন যে প্রদত্ত তথ্য সত্য এবং নির্ভুল।
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
