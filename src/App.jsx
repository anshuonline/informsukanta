import React, { useState, useRef } from 'react';
import { MapPin, Camera, Image as ImageIcon, Send, AlertCircle, CheckCircle2, User, Mail, Hash, FileText } from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pincode: '',
    complaint: '',
  });
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'

  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchLocation = () => {
    setLocationLoading(true);
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse geocoding using Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            setLocation({
              lat: latitude,
              lng: longitude,
              address: data.display_name,
            });
          } catch (error) {
            setLocationError('Failed to fetch address details.');
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          setLocationError('Location access denied or unavailable.');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Prepare FormData for Web3Forms
    const form = new FormData();
    // Use the access key provided in .env, or a fallback. 
    form.append('access_key', import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE');
    form.append('subject', `New Complaint from ${formData.name}`);
    form.append('from_name', 'Inform Sukanta Portal');
    form.append('replyto', formData.email);
    
    // Add text fields
    form.append('Name', formData.name);
    form.append('Email', formData.email);
    form.append('Pincode', formData.pincode);
    form.append('Complaint', formData.complaint);
    
    // Add location if available
    if (location) {
      form.append('Location_Address', location.address);
      form.append('Google_Maps_Link', `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`);
    }

    // Add image if available
    if (image) {
      form.append('attachment', image);
    }

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: form
      });
      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({ name: '', email: '', pincode: '', complaint: '' });
        setLocation(null);
        setImage(null);
        setImagePreview('');
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
    <div className="min-h-screen bg-ambient flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
      <div className="w-full max-w-2xl">
        {/* Header section */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-block p-3 rounded-full bg-orange-100 mb-2 shadow-sm border border-orange-200">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
            Inform <span className="text-orange-600">Sukanta</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-md mx-auto">
            Report your issues directly. We are here to listen and resolve your complaints promptly.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="bg-orange-600 h-2 w-full"></div>
          
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Complaint Submitted Successfully!</h4>
                  <p className="text-sm mt-1">Thank you for informing us. We will look into this matter immediately.</p>
                </div>
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Submission Failed</h4>
                  <p className="text-sm mt-1">There was an error sending your complaint. Please try again later.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" /> Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-500" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
                />
              </div>
            </div>

            {/* Pincode */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-orange-500" /> Pin Code
              </label>
              <input
                type="text"
                name="pincode"
                required
                maxLength="6"
                pattern="[0-9]{6}"
                value={formData.pincode}
                onChange={handleInputChange}
                placeholder="e.g. 700001"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50"
              />
            </div>

            {/* Complaint Details */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" /> Detailed Complaint
              </label>
              <textarea
                name="complaint"
                required
                rows="4"
                value={formData.complaint}
                onChange={handleInputChange}
                placeholder="Please describe your issue in detail..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-white/50 resize-none"
              ></textarea>
            </div>

            {/* Location Fetching */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" /> Exact Location
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Provide your current location to help us identify the issue area.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={locationLoading}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {locationLoading ? (
                    <span className="animate-pulse">Fetching...</span>
                  ) : (
                    <>Get My Location</>
                  )}
                </button>
              </div>
              
              {locationError && <p className="text-xs text-red-500">{locationError}</p>}
              
              {location && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm text-slate-700">
                  <p><span className="font-semibold text-orange-800">Address:</span> {location.address}</p>
                  <p className="text-xs text-slate-500 mt-1">Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-orange-500" /> Photo Evidence
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Take a live photo or upload from your gallery.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" /> Select Photo
                </button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {imagePreview && (
                <div className="mt-4 relative rounded-lg overflow-hidden border border-slate-200 shadow-sm max-w-xs">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(''); }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-lg"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Submitting...</span>
                ) : (
                  <>
                    Submit Complaint <Send className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                By submitting, you agree that the provided information is true and accurate.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
