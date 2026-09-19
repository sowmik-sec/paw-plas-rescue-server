# Paw Pals Rescue

A platform connecting rescued pets with adoptive families and funding emergency veterinary care and shelter campaigns through community donations.

## Language

**Pet**:
An animal listed for adoption with details including species category, age, location, and photos.
_Avoid_: Animal, listing, item

**Adoption Request**:
A formal request submitted by an authenticated user seeking to adopt an available Pet.
_Avoid_: Pet request, application, booking

**Donation Campaign**:
A time-bounded fundraising campaign created to cover medical or shelter expenses for a specific pet.
_Avoid_: Campaign, fundraiser, pet drive

**Donation**:
A financial contribution processed through Stripe and recorded against a Donation Campaign.
_Avoid_: Payment, transaction, gift

**Donor**:
A registered user who contributes funds to one or more Donation Campaigns.
_Avoid_: Contributor, supporter

**Adopter**:
A registered user who submits an Adoption Request to adopt a Pet.
_Avoid_: Requester, applicant

**Success Story**:
A published update highlighting a completed adoption and the pet's journey with their new family.
_Avoid_: Story, testimonial, review
