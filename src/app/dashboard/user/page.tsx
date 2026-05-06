"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, MapPin, CheckCircle, XCircle, Clock, Heart, Users, Phone, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Request {
  request_id: string;
  request_status: string;
  requested_at: string;
  trip_id: string;
  title: string;
  destination: string;
  duration_days: number;
  organizer_name: string;
}

interface Booking {
  booking_id: string;
  booking_status: string;
  booked_at: string;
  male_count: number;
  female_count: number;
  child_count: number;
  names: string;
  phone_number: string;
  trip_date: string;
  trip_id: string;
  title: string;
  destination: string;
  duration_days: number;
  image_url: string | null;
  organizer_name: string;
}

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'buddy' | 'premium'>('buddy');
  const [requests, setRequests] = useState<Request[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/user/requests");
        const data = await res.json();
        if (data.requests) setRequests(data.requests);
        if (data.bookings) setBookings(data.bookings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const parseNames = (namesStr: string): string[] => {
    try { return JSON.parse(namesStr); } catch { return []; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-8 pb-20 px-4">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Trip History</h1>
          <p className="text-slate-500 mt-1">Track your applications and bookings</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('buddy')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'buddy' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Buddy Trips
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'premium' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Curated Adventures
          </button>
        </div>
      </div>

      {activeTab === 'buddy' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          {requests.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No buddy applications</h3>
              <p className="text-slate-500 mb-6">Find a buddy trip and show interest to get started!</p>
              <button 
                onClick={() => router.push('/buddy')}
                className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-orange-600 transition"
              >
                Find Buddy Trips
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map(req => (
                <div key={req.request_id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-2">{req.title}</h3>
                      <div className="ml-4">
                        {req.request_status === 'pending' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {req.request_status === 'accepted' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5" /> Accepted
                          </span>
                        )}
                        {req.request_status === 'rejected' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="text-sm font-medium">{req.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="text-sm font-medium">{req.duration_days} Days</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">O</div>
                        <span className="text-sm font-medium">Organizer: {req.organizer_name}</span>
                      </div>
                    </div>
                  </div>

                  {req.request_status === 'accepted' ? (
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100">
                      <button
                        onClick={() => router.push(`/chat/${req.trip_id}`)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        Go to Trip Chat
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">
                        {req.request_status === 'pending' ? 'Waiting for approval...' : 'Application declined'}
                      </p>
                      <Link href={`/buddy`} className="text-xs font-bold text-orange-500 hover:underline">View more trips</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'premium' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          {bookings.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 text-center">
              <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No bookings yet</h3>
              <p className="text-slate-500 mb-6">Explore our premium curated adventures and book your next trip!</p>
              <button 
                onClick={() => router.push('/trips')}
                className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-orange-600 transition"
              >
                Browse Adventures
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map(book => {
                const names = parseNames(book.names);
                const totalPeople = book.male_count + book.female_count + book.child_count;
                
                return (
                  <div key={book.booking_id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
                    {book.image_url && (
                      <div className="h-32 w-full relative">
                        <img src={book.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                          <h3 className="text-lg font-bold text-white line-clamp-1">{book.title}</h3>
                          <div className="shrink-0">
                            {book.booking_status === 'pending' && (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Pending
                              </span>
                            )}
                            {book.booking_status === 'approved' && (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-400 text-emerald-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Approved
                              </span>
                            )}
                            {book.booking_status === 'rejected' && (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-400 text-rose-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-5 flex-1">
                      {!book.image_url && (
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{book.title}</h3>
                          <span className={`px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-full ${
                            book.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            book.booking_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {book.booking_status}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate" title={book.destination}>{book.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate">{new Date(book.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-400 shrink-0" />
                          <span>{totalPeople} People</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate">{book.phone_number}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Passenger Details</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {names.map((n, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500">
                        {book.male_count > 0 && <span>Male: {book.male_count}</span>}
                        {book.female_count > 0 && <span>Female: {book.female_count}</span>}
                        {book.child_count > 0 && <span>Children: {book.child_count}</span>}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">
                        Organizer: <span className="font-bold text-slate-700">{book.organizer_name}</span>
                      </p>
                      <Link href={`/trips/${book.trip_id}`} className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        View Trip <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
