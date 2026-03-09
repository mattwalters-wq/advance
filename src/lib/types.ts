export type Org = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type Profile = {
  id: string
  org_id: string
  full_name: string
  role: string
  created_at: string
}

export type Artist = {
  id: string
  org_id: string
  name: string
  project: string
  color: string
  status: string
  created_at: string
}

export type Tour = {
  id: string
  artist_id: string
  org_id: string
  name: string
  start_date: string
  end_date: string
  created_at: string
}

export type Show = {
  id: string
  tour_id: string
  org_id: string
  date: string
  venue: string
  city: string
  country: string
  stage: string
  set_time: string
  doors_time: string
  soundcheck_time: string
  notes: string
  created_at: string
}

export type Travel = {
  id: string
  tour_id: string
  org_id: string
  travel_date: string
  travel_type: string
  departure_time: string
  arrival_time: string
  from_location: string
  to_location: string
  carrier: string
  reference: string
  notes: string
  created_at: string
}

export type Accommodation = {
  id: string
  tour_id: string
  org_id: string
  check_in: string
  check_out: string
  name: string
  address: string
  confirmation: string
  notes: string
  created_at: string
}

export type Personnel = {
  id: string
  tour_id: string
  org_id: string
  name: string
  role: string
  email: string
  phone: string
  travel_notes: string
  created_at: string
}

export type Contact = {
  id: string
  tour_id: string
  org_id: string
  name: string
  role: string
  phone: string
  email: string
  created_at: string
}

export type DaySheet = {
  id: string
  show_id: string
  org_id: string
  share_token: string
  is_published: boolean
  created_at: string
}