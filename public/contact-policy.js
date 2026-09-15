(function (root) {
  "use strict";
  function validEmail(value) {
    const email = typeof value === "string" ? value.trim() : "";
    const parts = email.split("@");
    if (email.length > 254 || parts.length !== 2) return false;
    const [local, domain] = parts;
    return local.length > 0 && local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") &&
      /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) &&
      /^(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(domain);
  }

  function normalizePhone(value) {
    const phone = typeof value === "string" ? value.trim() : "";
    const invalid = () => { throw new Error("Enter a valid phone format: (305) 555-0123 or +44 20 7946 0958. Include the country code outside the U.S./Canada; no extensions."); };
    if (!phone || phone.length > 40 || /[^0-9+(). -]/.test(phone)) return invalid();
    const digits = phone.replace(/\D/g, "");
    if (!phone.startsWith("+") || phone.startsWith("+1")) {
      if (!/^(?:\+?1[ .-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[ .-]?[2-9]\d{2}[ .-]?\d{4}$/.test(phone)) return invalid();
      const national = digits.length === 11 ? digits.slice(1) : digits;
      if (/^(\d)\1{9}$/.test(national)) return invalid();
      return "+1" + national;
    }
    // International format check only; not numbering-plan or ownership verification.
    if (!/^\+[1-9]\d*(?:[ .-]\d+)*$/.test(phone) || digits.length < 8 || digits.length > 15 || /^(\d)\1+$/.test(digits)) return invalid();
    return "+" + digits;
  }

  function normalizeContact(input, email) {
    const method = input.preferredContactMethod ?? "email";
    if (!["email", "phone"].includes(method)) throw new Error("Choose Email or Phone as your preferred contact method.");
    if (!validEmail(email)) throw new Error("Enter a valid requester email, such as name@example.edu.");
    return { method, value: method === "phone" ? normalizePhone(input.contactPhone) : email.trim().toLowerCase() };
  }

  function contactFor(ticket) {
    if (ticket.contact?.method === "phone") return ticket.contact;
    return { method: "email", value: ticket.contact?.method === "email" ? ticket.contact.value : ticket.email };
  }

  function bindContactFields({ method, phone, phoneField }) {
    let busy = false;
    function sync() {
      const usePhone = method.value === "phone";
      phoneField.hidden = !usePhone;
      phone.required = usePhone;
      phone.disabled = busy || !usePhone;
      method.disabled = busy;
      phone.setCustomValidity("");
    }
    method.addEventListener("change", sync);
    phone.addEventListener("input", () => phone.setCustomValidity(""));
    phone.addEventListener("blur", () => {
      if (!phone.disabled && phone.value) {
        try { normalizePhone(phone.value); phone.setCustomValidity(""); }
        catch (error) { phone.setCustomValidity(error.message); }
      }
    });
    sync();
    return { sync, setBusy(value) { busy = value; sync(); }, reset() { method.value = "email"; phone.value = ""; busy = false; sync(); } };
  }
  const policy = { validEmail, normalizePhone, normalizeContact, contactFor, bindContactFields };
  if (typeof module === "object" && module.exports) module.exports = policy;
  else root.CapstoneContactPolicy = policy;
})(typeof window === "undefined" ? {} : window);
