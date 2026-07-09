"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";


function isProfileCompleteForBooking(user: any): boolean {
  return !!(user?.full_name?.trim() && user?.phone_number?.trim() && user?.age && user?.gender && user?.profession && user?.fooding_habit);
}
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
  const [currentImg, setCurrentImg] = useState(0);
  const router = useRouter();

  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [simulatedData, setSimulatedData] = useState<any>(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [formBookingId, setFormBookingId] = useState<string | null>(null);
  const [profileBlockMessage, setProfileBlockMessage] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          setProfileBlockMessage("Please sign in and complete your dashboard profile before booking a trip.");
          return;
        }
        setProfileBlockMessage(isProfileCompleteForBooking(data.user) ? null : "Complete your dashboard profile before booking a trip.");
      })
      .catch(() => setProfileBlockMessage("Complete your dashboard profile before booking a trip."));
  }, []);


  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const bookingIdParam = params.get("booking_id");
      if (bookingIdParam) {
        setLoading(true);
        fetch(`/api/bookings/${bookingIdParam}/status`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              let parsedNames: string[] = [];
              try {
                parsedNames = JSON.parse(data.names);
              } catch {
                parsedNames = String(data.names || "").split(",").map((n: string) => n.trim()).filter(Boolean);
              }

              const parsePhone = (fullPhone: string) => {
                if (!fullPhone) return { code: "+91", num: "" };
                const match = fullPhone.match(/^(\+\d+)\s+(.*)$/);
                return match ? { code: match[1], num: match[2] } : { code: "+91", num: fullPhone };
              };
              const phoneVal = parsePhone(data.phone_number);
              const altPhoneVal = parsePhone(data.alternate_phone_number);

              setForm({
                male_count: data.male_count || 0,
                female_count: data.female_count || 0,
                child_count: data.child_count || 0,
                names: parsedNames,
                country_code: phoneVal.code,
                phone_number: phoneVal.num,
                alternate_country_code: altPhoneVal.code,
                alternate_phone_number: altPhoneVal.num,
                trip_date: data.trip_date || trip.start_date || "",
              });
              setFormBookingId(bookingIdParam);
            }
          })
          .catch((err) => console.error("Failed to load booking details:", err))
          .finally(() => setLoading(false));
      }
    }
  }, [trip.start_date]);

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

  const formattedStartDate = trip.formatted_start_date || null;
  const durationLabel = trip.duration_label || `${Number(trip.duration_days || 0)} Days${Number(trip.duration_nights || 0) ? ` / ${Number(trip.duration_nights || 0)} Nights` : ""}`;

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

  const loadPaymentScript = (src: string, isLoaded: () => boolean) => {
    return new Promise<boolean>((resolve) => {
      if (isLoaded()) {
        resolve(true);
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const submitPaymentForm = (action: string, fields: Record<string, string>) => {
    const formEl = document.createElement("form");
    formEl.method = "POST";
    formEl.action = action;
    formEl.style.display = "none";
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      formEl.appendChild(input);
    });
    document.body.appendChild(formEl);
    formEl.submit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPersons === 0) {
      alert("Please add at least one person.");
      return;
    }
    if (profileBlockMessage) {
      alert(profileBlockMessage);
      router.push(profileBlockMessage.startsWith("Please sign in") ? "/login" : "/dashboard");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        trip_id: trip.id,
        phone_number: `${form.country_code} ${form.phone_number}`,
        alternate_phone_number: form.alternate_phone_number ? `${form.alternate_country_code} ${form.alternate_phone_number}` : "",
        booking_id: formBookingId,
        base_url: window.location.origin,
      };

      // 1. Create the booking and payment order on the server
      const res = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to initiate booking order");
        setLoading(false);
        return;
      }

      const data = await res.json();

      const checkout = data.checkout;

      if (data.isSimulated) {
        setSimulatedData(data);
        setShowSimulatedModal(true);
        setLoading(false);
        return;
      }

      if (!checkout) {
        alert("Payment checkout details are missing. Please contact support.");
        setLoading(false);
        return;
      }
      const scriptSrc = checkout.scriptUrl || "https://checkout.razorpay.com/v1/checkout.js";
      const scriptLoaded = await loadPaymentScript(scriptSrc, () => {
        if (checkout.method === "razorpay") return !!(window as any).Razorpay;
        if (checkout.method === "cashfree") return !!(window as any).Cashfree;
        return false;
      });
      if (!scriptLoaded) {
        alert("Failed to load payment checkout SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

      if (checkout.method === "cashfree") {
        const cashfree = (window as any).Cashfree({ mode: checkout.environment || "sandbox" });
        await cashfree.checkout({ paymentSessionId: checkout.paymentSessionId, redirectTarget: "_self" });
        return;
      }
      const checkoutKey = checkout.checkoutKey || data.checkoutKey || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if (!checkoutKey) {
        alert("Payment checkout key is missing. Please contact support.");
        setLoading(false);
        return;
      }

      const options = {
        key: checkoutKey,
        amount: data.amount,
        currency: data.currency,
        name: "GoTogether",
        description: `Booking for ${data.tripTitle}`,
        order_id: data.orderId,
        prefill: {
          name: data.prefill.name,
          email: data.prefill.email,
          contact: data.prefill.contact,
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/bookings/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                provider: data.provider,
              }),
            });

            if (verifyRes.ok) {
              alert("Payment received. Final confirmation will appear in your dashboard shortly.");
            } else {
              const verifyData = await verifyRes.json();
              alert(verifyData.error || "Payment verification pending.");
            }
          } catch (verifyErr) {
            console.error(verifyErr);
            alert("Verification timed out. Check your dashboard for payment status.");
          } finally {
            router.push("/dashboard/user?tab=premium");
          }
        },
        modal: {
          ondismiss: function () {
            alert("Payment cancelled. You have 12 hours to complete payment from your dashboard.");
            router.push("/dashboard/user?tab=premium");
          },
        },
        theme: {
          color: "#f97316",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("An error occurred while initiating your booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
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
              <span className="flex items-center gap-1.5 font-medium"><Clock className="w-5 h-5 text-orange-400"/> {durationLabel}</span>
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
                  if (!dataUrl.startsWith('data:')) {
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.download = `brochure-${trip.title.replace(/\s+/g, '-').toLowerCase()}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    return;
                  }
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

            <div className="flex items-end gap-2 mb-6 pb-6 border-b border-slate-100">
              {trip.gotogether_price || trip.b2b_price ? (
                <>
                  <span className="text-3xl font-extrabold text-emerald-600">{trip.gotogether_price || trip.b2b_price}</span>
                  {trip.b2c_price && (
                    <span className="text-sm font-semibold text-slate-400 line-through mb-1">{trip.b2c_price}</span>
                  )}
                  <span className="text-xs font-medium text-slate-400 mb-1">per person</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-extrabold text-emerald-600">{trip.b2c_price || 'Price TBD'}</span>
                  <span className="text-xs font-medium text-slate-400 mb-1">per person</span>
                </>
              )}
            </div>

            {profileBlockMessage && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                {profileBlockMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {trip.start_date ? (
                <input type="hidden" name="trip_date" value={trip.start_date} />
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" /> Select Travel Date *
                  </label>
                  <input
                    required
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={form.trip_date}
                    onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>
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

              <button type="submit" disabled={loading || !!profileBlockMessage} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Pay &amp; Book</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showSimulatedModal && simulatedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-[scaleUp_0.3s_ease-out]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-center relative">
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Simulated Sandbox
              </div>
              <h4 className="text-xl font-extrabold mb-1">
                {simulatedData.provider || 'Gateway'} Payment
              </h4>
              <p className="text-xs text-white/80 font-medium">
                Testing online checkout flow end-to-end
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trip Title</span>
                <span className="font-semibold text-slate-800 text-sm max-w-[200px] truncate">{simulatedData.tripTitle}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Ref</span>
                <span className="font-mono font-semibold text-slate-700 text-sm">{simulatedData.bookingRef}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</span>
                <span className="font-extrabold text-emerald-600 text-lg">{`INR ${(simulatedData.amount / 100).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passengers</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {totalPersons} Member{totalPersons !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5 text-xs text-amber-800 leading-relaxed font-medium">
                <strong>Sandbox Mode:</strong> Clicking "Simulate Success" will authorize this transaction with a mock signature. The system will trigger a simulated webhook to confirm the booking in the background.
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              <button
                disabled={simulatingPayment}
                onClick={async () => {
                  setSimulatingPayment(true);
                  try {
                    const verifyRes = await fetch("/api/bookings/verify-payment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        razorpay_order_id: simulatedData.orderId,
                        razorpay_payment_id: "pay_sim_" + Math.random().toString(36).substring(2, 11),
                        razorpay_signature: "mock_sig_" + Math.random().toString(36).substring(2, 16),
                        provider: simulatedData.provider,
                        isSimulated: true,
                        baseUrl: window.location.origin,
                      }),
                    });

                    if (verifyRes.ok) {
                      alert("Payment verification initiated. Booking confirmation webhook triggered.");
                      setShowSimulatedModal(false);
                      router.push("/dashboard/user?tab=premium");
                    } else {
                      const errData = await verifyRes.json();
                      alert(errData.error || "Simulated payment verification failed.");
                    }
                  } catch (err) {
                    console.error("Verification error:", err);
                    alert("Network error processing payment simulation.");
                  } finally {
                    setSimulatingPayment(false);
                  }
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {simulatingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simulate Success"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={simulatingPayment}
                  onClick={() => {
                    alert("Simulating payment failure...");
                    setShowSimulatedModal(false);
                    router.push("/dashboard/user?tab=premium");
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-3 rounded-xl border border-rose-200 text-sm transition-colors cursor-pointer text-center animate-pulse"
                >
                  Simulate Fail
                </button>
                <button
                  disabled={simulatingPayment}
                  onClick={() => setShowSimulatedModal(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 font-semibold py-3 rounded-xl border border-slate-200 text-sm transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
