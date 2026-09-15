const test = require("node:test");
const assert = require("node:assert/strict");
const { validEmail, normalizePhone, normalizeContact, contactFor } = require("../public/contact-policy");

test("contact emails accept common formats and reject malformed addresses", () => {
  for (const email of ["student@fiu.edu", " Demo.Test+capstone@example.edu ", "a_b@example.co.uk"]) assert.equal(validEmail(email), true, email);
  for (const email of [null, {}, "", "a@", "a@localhost", "a b@example.edu", "a@@example.edu", ".a@example.edu", "a..b@example.edu", "a.@example.edu", "a@-example.edu", "a@example-.edu", "a@example..edu", "a@ex_ample.edu", "a".repeat(65) + "@example.edu"]) assert.equal(validEmail(email), false, String(email));
});

test("phone format validation normalizes supported local and international formats", () => {
  for (const phone of ["3055550123", "(305) 555-0123", "305.555.0123", "1-305-555-0123", "+1 (305) 555-0123"]) assert.equal(normalizePhone(phone), "+13055550123");
  assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  for (const phone of [null, {}, "", "123", "0000000000", "3051550123", "1115550123", "30555501234", "call3055550123", "3055550123 ext 2", "+0 123456789", "+44++2079460958", "+44 20 7946 09589999999", "+44 20 7946 0958\nX"]) assert.throws(() => normalizePhone(phone), /valid phone format/);
});

test("contact preferences keep email identity and do not retain an unused phone", () => {
  assert.deepEqual(normalizeContact({}, "USER@EXAMPLE.EDU"), { method: "email", value: "user@example.edu" });
  assert.deepEqual(normalizeContact({ preferredContactMethod: "email", contactPhone: "unused invalid phone" }, "user@example.edu"), { method: "email", value: "user@example.edu" });
  assert.deepEqual(normalizeContact({ preferredContactMethod: "phone", contactPhone: "3055550123" }, "user@example.edu"), { method: "phone", value: "+13055550123" });
  assert.throws(() => normalizeContact({ preferredContactMethod: "phone", contactPhone: "3055550123" }, "bad@email"), /valid requester email/);
  assert.throws(() => normalizeContact({ preferredContactMethod: "sms" }, "user@example.edu"), /Email or Phone/);
  assert.throws(() => normalizeContact({ preferredContactMethod: "phone" }, "user@example.edu"), /valid phone format/);
  assert.deepEqual(contactFor({ email: "legacy@example.edu" }), { method: "email", value: "legacy@example.edu" });
});
