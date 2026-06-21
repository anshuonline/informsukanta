import React, { useState, useRef } from 'react';
import { MapPin, Camera, Image as ImageIcon, Send, AlertCircle, CheckCircle2, User, Mail, Hash, FileText, Map, HelpCircle, Phone, Share2, Info, ShieldAlert } from 'lucide-react';
import imageCompression from 'browser-image-compression';
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Captcha states
  const [captchaNum1, setCaptchaNum1] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaNum2, setCaptchaNum2] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer('');
    setCaptchaError('');
  };

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

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      alert('আপনি সর্বাধিক ৫ টি ছবি আপলোড করতে পারবেন। (You can upload a maximum of 5 photos.)');
    }
    
    const allowedFiles = files.slice(0, 5 - images.length);
    if (allowedFiles.length === 0) return;

    setIsCompressing(true);

    const options = {
      maxSizeMB: 1, // Max file size in MB
      maxWidthOrHeight: 1280, // Max width/height in pixels
      useWebWorker: true,
    };

    try {
      const compressedFilesPromises = allowedFiles.map(async (file) => {
        try {
          const compressedFile = await imageCompression(file, options);
          return {
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile)
          };
        } catch (error) {
          console.error("Error compressing image:", error);
          // Fallback to original if compression fails
          return {
            file,
            preview: URL.createObjectURL(file)
          };
        }
      });

      const newImages = await Promise.all(compressedFilesPromises);
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Compression process failed:", error);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
    
    if (parseInt(captchaAnswer) !== (captchaNum1 + captchaNum2)) {
      setCaptchaError('ক্যাপচা উত্তরটি ভুল হয়েছে। (Incorrect captcha answer)');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');
    setLocationRequiredError(false);
    setCaptchaError('');

    const form = new FormData();
    form.append('access_key', import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE');
    form.append('subject', `নতুন অভিযোগ: ${formData.name}`);
    form.append('from_name', 'সুকান্তকে জানান পোর্টাল');
    form.append('replyto', formData.email);
    
    form.append('Name', formData.name);
    form.append('Phone', formData.phone);
    form.append('Email', formData.email);
    form.append('Pincode', formData.pincode);
    if (formData.locationName) {
      form.append('Area', formData.locationName);
    }
    if (formData.problemType) {
      form.append('Problem_Type', formData.problemType);
    }
    form.append('Complaint', formData.complaint);
    
    if (location) {
      form.append('Location_Address', location.address);
      form.append('Google_Maps_Link', `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`);
    }

    // 1. Upload images to ImgBB first to bypass Web3Forms attachment limits
    const uploadedImageUrls = [];
    try {
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imgFile = images[i].file;
          const imgData = new FormData();
          imgData.append('image', imgFile);
          
          const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY || 'efa7e6a7fb5f364f78fc5e3b3d4d6785'}`, {
            method: 'POST',
            body: imgData,
          });
          const imgResult = await imgResponse.json();
          if (imgResult.success) {
            uploadedImageUrls.push(imgResult.data.url);
          }
        }
      }

      // 2. Append image URLs to Web3Forms as separate text fields
      if (uploadedImageUrls.length > 0) {
        uploadedImageUrls.forEach((url, index) => {
          form.append(`Photo_Link_${index + 1}`, url);
        });
      }

      // 3. Submit to Web3Forms
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: form
      });
      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setErrorMessage('');
        setFormData({ name: '', phone: '', email: '', pincode: '', locationName: '', problemType: '', complaint: '' });
        setLocation(null);
        setImages([]);
        setAvailableLocations([]);
        generateCaptcha();
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.message || 'API request failed');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-ambient flex items-center justify-center p-4 sm:p-8 font-sans text-slate-800">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl p-8 sm:p-10 text-center bg-white/90 backdrop-blur-xl border border-white/50 relative">
            {/* Confetti or decorative background could go here */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-green-50">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3">ধন্যবাদ!</h2>
            <h3 className="text-lg font-bold text-green-700 mb-4">আপনার অভিযোগ সফলভাবে জমা হয়েছে।</h3>
            
            <p className="text-slate-600 mb-8 leading-relaxed text-sm">
              আমাদের জানানোর জন্য অসংখ্য ধন্যবাদ। আমরা আপনার সমস্যাটি গুরুত্ব সহকারে খতিয়ে দেখব এবং দ্রুত সংশ্লিষ্ট কর্তৃপক্ষের মাধ্যমে সমাধানের ব্যবস্থা করব।
            </p>
            
            <button
              onClick={() => setSubmitStatus(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              আরেকটি অভিযোগ জানান
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            
            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">জমা দেওয়া ব্যর্থ হয়েছে</h4>
                  <p className="text-sm mt-1">আপনার অভিযোগ পাঠানোর সময় একটি ত্রুটি হয়েছে৷ অনুগ্রহ করে পরে আবার চেষ্টা করুন৷</p>
                  {errorMessage && (
                    <p className="text-xs mt-2 p-2 bg-red-100 rounded border border-red-200 font-mono break-all">
                      Debug: {errorMessage}
                    </p>
                  )}
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
                    <Camera className="w-5 h-5 text-orange-500" /> একাধিক ছবির প্রমাণ
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">সর্বোচ্চ ৫ টি ছবি আপলোড করতে পারবেন।</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 5 || isCompressing}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompressing ? (
                    <span className="animate-pulse">প্রসেসিং...</span>
                  ) : (
                    <><ImageIcon className="w-4 h-4" /> ছবি নির্বাচন করুন ({images.length}/5)</>
                  )}
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

            {/* Math Captcha */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" /> সিকিউরিটি চেক (Security Check) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-lg text-slate-800 shadow-sm flex-shrink-0">
                  {captchaNum1} + {captchaNum2} =
                </div>
                <input
                  type="number"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="উত্তর লিখুন"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>
              {captchaError && <p className="text-xs text-red-500 font-medium">{captchaError}</p>}
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

        {/* How it works & Disclaimer Section */}
        <div className="mt-8 space-y-6">
          {/* How it works */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-600" /> কীভাবে এটি কাজ করে? (প্রযুক্তিগত তথ্য)
            </h3>
            <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
              <p>
                <strong>১০০% সুরক্ষিত এবং সরাসরি যোগাযোগ:</strong> এই ওয়েবসাইটে কোনো নিজস্ব ডেটাবেস (Database) নেই। অর্থাৎ আপনার দেওয়া কোনো ব্যক্তিগত তথ্য বা অভিযোগ ওয়েবসাইটে সেভ করা হয় না। 
              </p>
              <p>
                আপনি যখনই ফর্মটি পূরণ করে সাবমিট করবেন, তখন প্রযুক্তিগতভাবে সম্পূর্ণ তথ্য (ছবি ও লাইভ লোকেশন সহ) সরাসরি <strong>ইমেইলের মাধ্যমে বিধায়ক সাহেবের কাছে</strong> চলে যায়। এর ফলে আপনার অভিযোগটি সম্পূর্ণ গোপনীয় থাকে এবং দ্রুততম সময়ে সঠিক জায়গায় পৌঁছায়।
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-orange-50/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-orange-200 text-center">
            <div className="flex justify-center mb-2">
              <ShieldAlert className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="text-sm font-bold text-orange-800 mb-2">ঘোষণাপত্র (Disclaimer)</h4>
            <p className="text-xs text-slate-700 leading-relaxed max-w-lg mx-auto font-medium">
              এটি বিধায়ক সুকান্ত বিশ্বাসের কোনো <strong>অফিসিয়াল ওয়েবসাইট নয়</strong>। এটি একটি স্বাধীন কমিউনিটি উদ্যোগ। সাধারণ মানুষ যাতে তাদের এলাকার সমস্যাগুলি সহজে ও দ্রুত বিধায়কের কাছে পৌঁছে দিতে পারে, তার জন্যই এই পোর্টালটি তৈরি করা হয়েছে।
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
