import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import {
  X, QrCode, Zap, ExternalLink, CheckCircle2, Copy, AlertCircle,
  Smartphone, CreditCard, Globe, TicketIcon, Building, Calendar, MapPin
} from 'lucide-react';

// Builds the UPI deep-link string that GPay / PhonePe / Paytm can scan
const buildUpiString = (upiId, amount, eventTitle) => {
  const note = encodeURIComponent(`Event: ${eventTitle}`.slice(0, 50));
  const name = encodeURIComponent('CampusForge Events');
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
};

const UPIQRCode = ({ upiId, amount, eventTitle }) => {
  const upiString = buildUpiString(upiId || 'campusforge@upi', amount, eventTitle || 'Event');

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
      {/* Real QR Code */}
      <div className="p-3 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
        <QRCodeSVG
          value={upiString}
          size={160}
          bgColor="#ffffff"
          fgColor="#1e1b4b"
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="mt-3 text-center space-y-1">
        <div className="text-xs text-gray-500">Scan with any UPI app to pay</div>
        <div className="text-sm font-bold text-gray-900">{upiId || 'campusforge@upi'}</div>
        <div className="text-xl font-black text-indigo-700">₹{amount}</div>
      </div>

      {/* UPI App badges */}
      <div className="flex items-center gap-2 mt-3">
        {[
          { name: 'GPay', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
          { name: 'PhonePe', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
          { name: 'Paytm', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
        ].map(app => (
          <div key={app.name} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${app.cls}`}>
            {app.name}
          </div>
        ))}
      </div>

      {/* Tap-to-pay link for mobile */}
      <a
        href={upiString}
        className="mt-3 text-[11px] text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
      >
        Tap here to open UPI app (mobile)
      </a>
    </div>
  );
};

// Digital Ticket display shown after successful registration
const DigitalTicket = ({ registration, opp, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyTicket = () => {
    navigator.clipboard.writeText(registration.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-xl font-black text-gray-900">You're Registered! 🎉</h3>
        <p className="text-sm text-gray-500 mt-1">Your digital event pass has been issued.</p>
      </div>

      {/* Digital Ticket Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-5 text-white text-left relative overflow-hidden shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

        <div className="flex items-center gap-2 mb-3">
          <TicketIcon className="w-5 h-5 text-indigo-200" />
          <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">CampusForge Event Pass</span>
        </div>

        <h4 className="text-lg font-black leading-tight mb-3">{registration.opportunity_title}</h4>

        <div className="space-y-1.5 text-xs">
          {registration.event_venue && (
            <div className="flex items-center gap-1.5 text-indigo-200">
              <MapPin className="w-3.5 h-3.5" />
              <span>{registration.event_venue}</span>
            </div>
          )}
          {registration.event_start_at && (
            <div className="flex items-center gap-1.5 text-indigo-200">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(registration.event_start_at).toLocaleString()}</span>
            </div>
          )}
          {registration.college && (
            <div className="flex items-center gap-1.5 text-indigo-200">
              <Building className="w-3.5 h-3.5" />
              <span>{registration.college}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">Ticket Code</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-black tracking-wider">{registration.ticket_code}</span>
            <button
              onClick={copyTicket}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-indigo-300 flex items-center justify-between">
          <span>Registered: {registration.attendee_name}</span>
          {registration.payment_status === 'paid_upi' && (
            <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              ₹{registration.amount_paid} Paid ✓
            </span>
          )}
          {registration.payment_status === 'paid_demo' && (
            <span className="bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
              Demo Pay ✓
            </span>
          )}
          {registration.payment_status === 'free' && (
            <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              Free Entry ✓
            </span>
          )}
          {registration.payment_status === 'external_form' && (
            <span className="bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-semibold">
              Form Submitted ✓
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Save your ticket code <strong>{registration.ticket_code}</strong> — show it at the venue entrance.
      </p>

      <button
        onClick={onClose}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors"
      >
        Go to My Tickets
      </button>
    </div>
  );
};

// ─── Main Modal ─────────────────────────────────────────────────────────────

export const EventCheckoutModal = ({ opp, currentUser, onClose, onSuccess }) => {
  const isPaid = opp.is_paid && opp.fee_amount > 0;
  const hasExternalLink = opp.registration_link && opp.registration_link.trim();
  const regType = opp.registration_type || 'both';
  const showNative = regType === 'native' || regType === 'both';
  const showExternal = (regType === 'external_link' || regType === 'both') && hasExternalLink;

  const [step, setStep] = useState('choose'); // choose | native_pay | upi | success
  const [payMode, setPayMode] = useState(isPaid ? 'upi_utr' : 'free');
  const [utrRef, setUtrRef] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  const handleNativeRegister = async (method) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        attendee_name: currentUser?.name || 'Student',
        attendee_email: currentUser?.email || '',
        attendee_college: currentUser?.college || '',
        attendee_phone: attendeePhone || null,
        payment_method: method,
        payment_reference: method === 'upi_utr' ? utrRef.trim() : null,
        amount_paid: isPaid ? opp.fee_amount : 0,
      };
      const result = await api.registerForEvent(opp.id, payload);
      setTicket(result);
      setStep('success');
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExternalFormTrack = async () => {
    // Open external form then track it as external_form registration
    window.open(opp.registration_link, '_blank', 'noreferrer');
    try {
      const payload = {
        attendee_name: currentUser?.name || 'Student',
        attendee_email: currentUser?.email || '',
        attendee_college: currentUser?.college || '',
        payment_method: 'google_form',
        amount_paid: 0,
      };
      const result = await api.registerForEvent(opp.id, payload);
      setTicket(result);
      setStep('success');
      if (onSuccess) onSuccess(result);
    } catch (err) {
      // If already registered or any error, just open the link silently
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-tight">{opp.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Building className="w-3 h-3" />
              {opp.organizer_name}
              {opp.college && <> · {opp.college}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-2 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Step: choose registration method */}
          {step === 'choose' && (
            <div className="space-y-4">
              {isPaid && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                  <span className="font-semibold text-amber-800">Registration Fee</span>
                  <span className="font-black text-amber-900 text-lg">₹{opp.fee_amount}</span>
                </div>
              )}

              {!isPaid && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold text-center">
                  🎉 Free Event — No Registration Fee!
                </div>
              )}

              <div className="space-y-2">
                {/* Native In-App Registration */}
                {showNative && (
                  <button
                    onClick={() => isPaid ? setStep('native_pay') : handleNativeRegister('free')}
                    disabled={submitting}
                    className="w-full p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl">
                          {isPaid ? <CreditCard className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {isPaid ? 'Pay & Register Instantly' : '1-Click Register'}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {isPaid
                              ? `Pay ₹${opp.fee_amount} via UPI · Get digital ticket immediately`
                              : 'Register now and get your digital event pass'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Recommended
                      </div>
                    </div>
                  </button>
                )}

                {/* Google Form / External Link */}
                {showExternal && (
                  <button
                    onClick={handleExternalFormTrack}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 text-gray-600 rounded-xl">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          Register via Google Form
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Opens the organizer's external registration form in a new tab
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Step: paid native checkout */}
          {step === 'native_pay' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold text-gray-900">Complete Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Scan QR or use any UPI app to pay ₹{opp.fee_amount}</p>
              </div>

              <UPIQRCode upiId={opp.host_upi_id} amount={opp.fee_amount} eventTitle={opp.title} />

              {/* Pay mode tabs */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => setPayMode('upi_utr')}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                    payMode === 'upi_utr' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Enter UTR Number
                </button>
                <button
                  onClick={() => setPayMode('demo_instant')}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                    payMode === 'demo_instant' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  ⚡ Demo Pay
                </button>
              </div>

              {payMode === 'upi_utr' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      UPI Transaction Reference (UTR Number) *
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit UTR e.g. 429182749102"
                      value={utrRef}
                      onChange={e => setUtrRef(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Find the 12-digit UTR in your Google Pay / PhonePe / Paytm transaction history after payment.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={attendeePhone}
                      onChange={e => setAttendeePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <button
                    onClick={() => handleNativeRegister('upi_utr')}
                    disabled={submitting || utrRef.trim().length < 6}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : `Confirm ₹${opp.fee_amount} Payment & Register`}
                  </button>
                </div>
              )}

              {payMode === 'demo_instant' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <strong>⚡ Demo / Test Mode</strong> — Instantly confirms payment without real money. Use this during hackathon evaluations to test the full checkout flow.
                  </div>
                  <button
                    onClick={() => handleNativeRegister('demo_instant')}
                    disabled={submitting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    {submitting ? 'Processing...' : `⚡ Instant Pay ₹${opp.fee_amount} (Demo)`}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => setStep('choose')}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to options
              </button>
            </div>
          )}

          {/* Step: success + digital ticket */}
          {step === 'success' && ticket && (
            <DigitalTicket
              registration={ticket}
              opp={opp}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
