"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Calendar, Clock, CheckCircle, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

export default function TripDetailsClient({ trip }: { trip: any }) {
  const [form, setForm] = useState({
    male_count: 0,
    female_count: 0,
    child_count: 0,
    names: [] as string[],
    country_code: "+91",
    phone_number: "",
    alternate_country_code: "+91",
    alternate_phone_number: "",
    trip_date: trip.start_date || "",
  });
  const [loading, setLoading] = useState(false);
  const [customDate, setCustomDate] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const router = useRouter();

  const totalPersons = form.male_count + form.female_count + form.child_count;

  // Parse images
  let imageList: string[] = [];
  if (trip.images) {
    try {
      const parsed = JSON.parse(trip.images);
      if (Array.isArray(parsed)) imageList = parsed;
    } catch { /* fallback */ }
  }
  if (imageList.length === 0 && trip.image_url) {
    imageList = [trip.image_url];
  }

  // Format start_date
  const formattedStartDate = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Adjust names array size when counts change
  const handleCountChange = (field: "male_count" | "female_count" | "child_count", val: number) => {
    if (val < 0) return;
    const newForm = { ...form, [field]: val };
    const newTotal = newForm.male_count + newForm.female_count + newForm.child_count;
    
    let newNames = [...newForm.names];
    if (newTotal > newNames.length) {
      newNames = [...newNames, ...Array(newTotal - newNames.length).fill("")];
    } else if (newTotal < newNames.length) {
      newNames = newNames.slice(0, newTotal);
    }
    
    setForm({ ...newForm, names: newNames });
  };

  const handleNameChange = (index: number, val: string) => {
    const newNames = [...form.names];
    newNames[index] = val;
    setForm({ ...form, names: newNames });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPersons === 0) {
      alert("Please add at least one person.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        phone_number: `${form.country_code} ${form.phone_number}`,
        alternate_phone_number: form.alternate_phone_number ? `${form.alternate_country_code} ${form.alternate_phone_number}` : "",
      };

      const res = await fetch(`/api/trips/${trip.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Booking submitted successfully!");
        router.push("/trips");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit booking");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while submitting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      {/* Image Gallery / Slideshow */}
      <div className="relative h-80 w-full bg-slate-200">
        {imageList.length > 0 ? (
          <>
            {imageList.map((src, idx) => (
              <Image
                key={idx}
                src={src}
                alt={trip.title}
                fill
                className={`object-cover transition-opacity duration-500 ${idx === currentImg ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            {/* Navigation arrows */}
            {imageList.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImg((p) => (p - 1 + imageList.length) % imageList.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentImg((p) => (p + 1) % imageList.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {imageList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImg(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentImg ? "bg-white w-6" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                {/* Counter */}
                <span className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full z-10">
                  {currentImg + 1} / {imageList.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
            <MapPin className="w-16 h-16 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <span className="flex items-center gap-1.5 font-medium"><MapPin className="w-5 h-5 text-orange-400"/> {trip.destination}</span>
              <span className="flex items-center gap-1.5 font-medium"><Clock className="w-5 h-5 text-orange-400"/> {trip.duration_days} Days {trip.duration_nights ? ` / ${trip.duration_nights} Nights` : ''}</span>
              {formattedStartDate && (
                <span className="flex items-center gap-1.5 font-medium"><Calendar className="w-5 h-5 text-emerald-400"/> Starts: {formattedStartDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">About this Trip</h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">{trip.description}</p>
          </div>

          {(trip.pickup_point || trip.drop_point) && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Route Details</h3>
              <div className="flex flex-col md:flex-row items-center gap-4">
                {trip.pickup_point && (
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pickup Point</span>
                    <span className="font-semibold text-slate-800">{trip.pickup_point}</span>
                  </div>
                )}
                {trip.pickup_point && trip.drop_point && <span className="text-orange-400 font-bold">&rarr;</span>}
                {trip.drop_point && (
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Drop Point</span>
                    <span className="font-semibold text-slate-800">{trip.drop_point}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Gallery Thumbnails */}
          {imageList.length > 1 && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Gallery</h3>
              <div className="grid grid-cols-5 gap-3">
                {imageList.map((src, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      idx === currentImg ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img src={src} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {trip.brochure_url && (
            <div>
              <button
                onClick={() => {
                  const dataUrl = trip.brochure_url;
                  // Convert data URL to Blob for reliable download
                  const byteString = atob(dataUrl.split(',')[1]);
                  const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                  const blob = new Blob([ab], { type: mimeType });
                  const url = URL.createObjectURL(blob);
                  const ext = mimeType === 'application/pdf' ? '.pdf' : '.jpg';
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `brochure-${trip.title.replace(/\s+/g, '-').toLowerCase()}${ext}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-5 py-3 rounded-xl font-bold hover:bg-orange-200 transition-colors cursor-pointer"
              >
                Download Official Brochure
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sticky top-28">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Book Trip</h3>

            {/* Price Section — hidden when custom date is active */}
            {!customDate && (
              <div className="flex items-end gap-2 mb-6 pb-6 border-b border-slate-100">
                {trip.gotogether_price ? (
                  <>
                    <span className="text-3xl font-extrabold text-emerald-600">{trip.gotogether_price}</span>
                    <span className="text-sm font-semibold text-slate-400 line-through mb-1">{trip.b2c_price}</span>
                    <span className="text-xs font-medium text-slate-400 mb-1">per person</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-emerald-600">{trip.b2c_price || 'Price TBD'}</span>
                    <span className="text-xs font-medium text-slate-400 mb-1">per person</span>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Custom Date Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Customize your date</p>
                  {formattedStartDate && !customDate && (
                    <p className="text-xs text-slate-500 mt-0.5">Fixed: {formattedStartDate}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate(!customDate);
                    if (!customDate) {
                      // Switching to custom: clear fixed date
                      setForm({ ...form, trip_date: "" });
                    } else {
                      // Switching back: restore start_date
                      setForm({ ...form, trip_date: trip.start_date || "" });
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                    customDate ? "bg-orange-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      customDate ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Custom Date Warning & Picker */}
              {customDate && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Price may vary for custom dates. The final price will be confirmed after review.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Your Date *</label>
                    <input required type="date" value={form.trip_date} onChange={e => setForm({...form, trip_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                  </div>
                </div>
              )}

              {/* Fixed date (hidden input) */}
              {!customDate && trip.start_date && (
                <input type="hidden" name="trip_date" value={trip.start_date} />
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Adults (M)</label>
                  <input type="number" min={0} value={form.male_count} onChange={e => handleCountChange('male_count', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Adults (F)</label>
                  <input type="number" min={0} value={form.female_count} onChange={e => handleCountChange('female_count', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Children</label>
                  <input type="number" min={0} value={form.child_count} onChange={e => handleCountChange('child_count', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-center" />
                </div>
              </div>

              {totalPersons > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Passenger Names *</label>
                  {form.names.map((name, idx) => (
                    <input key={idx} required type="text" placeholder={`Passenger ${idx + 1} Name`} value={name} onChange={e => handleNameChange(idx, e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm" />
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <div className="flex gap-2">
                    <select
                      value={form.country_code}
                      onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                      className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all text-sm bg-slate-50"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input required type="tel" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value.replace(/\D/g, '')})} placeholder="Primary contact" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Alternate Phone</label>
                  <div className="flex gap-2">
                    <select
                      value={form.alternate_country_code}
                      onChange={(e) => setForm({ ...form, alternate_country_code: e.target.value })}
                      className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 transition-all text-sm bg-slate-50"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input type="tel" value={form.alternate_phone_number} onChange={e => setForm({...form, alternate_phone_number: e.target.value.replace(/\D/g, '')})} placeholder="Optional" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Request Booking</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
