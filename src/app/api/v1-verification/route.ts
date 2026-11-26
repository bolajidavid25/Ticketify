import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getPayloadClient } from '@/lib/payload'
import { studentAuth } from '@/lib/app-auth'

export type V1TestResult = {
  testId: string
  name: string
  endpoint: string
  method: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
  evidence?: any
}

function generateCode(): string {
  return `TD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

export async function GET(request: Request) {
  const tests: V1TestResult[] = []
  const payload = await getPayloadClient()
  const origin = new URL(request.url).origin
  const tag = Date.now().toString().slice(-6)

  const runTest = (result: V1TestResult) => {
    tests.push(result)
  }

  // TEST 1: GET /api/v1/events
  try {
    const res = await fetch(`${origin}/api/v1/events?category=Music&limit=5`)
    const json = await res.json()

    const passed = res.ok && json.success === true && Array.isArray(json.data) && json.pagination

    runTest({
      testId: 'TEST-V1-1-EVENTS-LIST',
      name: 'List Events with Filtering & Pagination',
      endpoint: '/api/v1/events',
      method: 'GET',
      expected: 'HTTP 200 with success: true, filtered events array, and pagination metadata',
      actual: passed
        ? `HTTP ${res.status}. Returned ${json.data.length} event(s). Total docs: ${json.pagination.totalDocs}. First title: "${json.data[0]?.title}"`
        : `Failed with status ${res.status}: ${JSON.stringify(json)}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        status: res.status,
        eventCount: json.data?.length,
        pagination: json.pagination,
        sampleEvent: json.data?.[0],
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-1-EVENTS-LIST',
      name: 'List Events with Filtering & Pagination',
      endpoint: '/api/v1/events',
      method: 'GET',
      expected: 'HTTP 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // TEST 2: GET /api/v1/events/[slug]
  try {
    const slug = 'afrobeats-campus-fest'
    const res = await fetch(`${origin}/api/v1/events/${slug}`)
    const json = await res.json()

    // Also test 404
    const res404 = await fetch(`${origin}/api/v1/events/non-existent-slug-xyz`)

    const passed =
      res.ok &&
      json.success === true &&
      json.data.slug === slug &&
      typeof json.data.remainingSeats === 'number' &&
      res404.status === 404

    runTest({
      testId: 'TEST-V1-2-EVENT-DETAIL',
      name: 'Single Event Detail & 404 Handling',
      endpoint: '/api/v1/events/[slug]',
      method: 'GET',
      expected: 'HTTP 200 with event detail & remaining seats; HTTP 404 for missing slug',
      actual: passed
        ? `HTTP 200 for "${slug}" (Remaining: ${json.data.remainingSeats}, SoldOut: ${json.data.isSoldOut}). HTTP 404 correctly returned for missing slug.`
        : `Failed: valid slug status ${res.status}, invalid slug status ${res404.status}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        slug: json.data?.slug,
        capacity: json.data?.capacity,
        remainingSeats: json.data?.remainingSeats,
        isSoldOut: json.data?.isSoldOut,
        status404Check: res404.status,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-2-EVENT-DETAIL',
      name: 'Single Event Detail & 404 Handling',
      endpoint: '/api/v1/events/[slug]',
      method: 'GET',
      expected: 'HTTP 200 and 404',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // Setup Test Students for Authenticated Endpoints
  const studentEmail = `api.student.${tag}@campus.edu`
  const studentId = `STU-API-${tag}`
  const testStudent = await payload.create({
    collection: 'users',
    data: {
      name: 'Ada API Test',
      email: studentEmail,
      studentId,
      password: 'Password123!',
      authProvider: 'local',
    },
    overrideAccess: true,
  })

  // Issue session token
  const token = await studentAuth.issueUserSession(testStudent)
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  }

  // TEST 3: GET /api/v1/me (Authentication & Profile)
  try {
    // 3A. Unauthenticated request
    const unauthRes = await fetch(`${origin}/api/v1/me`)
    // 3B. Authenticated request
    const authRes = await fetch(`${origin}/api/v1/me`, { headers: authHeaders })
    const authJson = await authRes.json()

    const passed =
      unauthRes.status === 401 &&
      authRes.status === 200 &&
      authJson.success === true &&
      authJson.data.user.id === testStudent.id &&
      Array.isArray(authJson.data.activeTickets) &&
      Array.isArray(authJson.data.waitlist)

    runTest({
      testId: 'TEST-V1-3-ME-PROFILE',
      name: 'Student Profile & Session Resolution (/api/v1/me)',
      endpoint: '/api/v1/me',
      method: 'GET',
      expected: 'HTTP 401 unauthenticated; HTTP 200 authenticated with profile, active tickets, waitlist and unread count',
      actual: passed
        ? `Unauthenticated: HTTP 401. Authenticated: HTTP 200 for student "${authJson.data.user.name}" (ID: ${authJson.data.user.id}, StudentId: "${authJson.data.user.studentId}").`
        : `Failed. Unauthenticated status: ${unauthRes.status}, Authenticated status: ${authRes.status}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        unauthStatus: unauthRes.status,
        authStatus: authRes.status,
        profile: authJson.data?.user,
        activeTicketsCount: authJson.data?.activeTickets?.length,
        waitlistCount: authJson.data?.waitlist?.length,
        unreadNotificationsCount: authJson.data?.unreadNotificationsCount,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-3-ME-PROFILE',
      name: 'Student Profile & Session Resolution (/api/v1/me)',
      endpoint: '/api/v1/me',
      method: 'GET',
      expected: 'HTTP 401 and 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // Create an isolated event for API ticket booking tests
  const apiTestEvent = await payload.create({
    collection: 'events',
    data: {
      title: `V1 API Live Showcase ${tag}`,
      slug: `v1-api-showcase-${tag}`,
      description: 'Test event for /api/v1/tickets booking, cancellation, and waitlist integration',
      startsAt: new Date(Date.now() + 86400000 * 4).toISOString(),
      venue: 'Auditorium 3',
      category: 'Community',
      capacity: 1, // Strict 1 seat to test sold out & waitlist
      issuedCount: 0,
      price: 0,
      status: 'published',
    },
    overrideAccess: true,
  })

  // TEST 4: POST /api/v1/tickets/book
  let bookedTicketCode = ''
  try {
    // 4A: Valid booking
    const bookRes = await fetch(`${origin}/api/v1/tickets/book`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ eventId: apiTestEvent.id }),
    })
    const bookJson = await bookRes.json()
    bookedTicketCode = bookJson.ticketCode

    // 4B: Re-booking duplicate (1-ticket-per-student limit)
    const dupRes = await fetch(`${origin}/api/v1/tickets/book`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ eventId: apiTestEvent.id }),
    })
    const dupJson = await dupRes.json()

    const passed =
      bookRes.status === 200 &&
      bookJson.success === true &&
      Boolean(bookJson.ticketCode) &&
      dupRes.status === 400 &&
      dupJson.success === false

    runTest({
      testId: 'TEST-V1-4-TICKET-BOOKING',
      name: 'Ticket Booking & 1-Ticket Invariant (/api/v1/tickets/book)',
      endpoint: '/api/v1/tickets/book',
      method: 'POST',
      expected: 'HTTP 200 with ticketCode for first booking; HTTP 400 rejection for duplicate booking on same event',
      actual: passed
        ? `First booking HTTP 200: Code "${bookJson.ticketCode}". Duplicate booking HTTP 400: "${dupJson.error}".`
        : `Booking failed. Book status: ${bookRes.status}, Dup status: ${dupRes.status}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        firstBooking: bookJson,
        duplicateBooking: dupJson,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-4-TICKET-BOOKING',
      name: 'Ticket Booking & 1-Ticket Invariant (/api/v1/tickets/book)',
      endpoint: '/api/v1/tickets/book',
      method: 'POST',
      expected: 'HTTP 200 and 400',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // Setup Student 2 for waitlist testing on sold out event
  const studentEmail2 = `api.waiter.${tag}@campus.edu`
  const studentId2 = `STU-WAITER-${tag}`
  const waiterStudent = await payload.create({
    collection: 'users',
    data: {
      name: 'Bob Waiter API',
      email: studentEmail2,
      studentId: studentId2,
      password: 'Password123!',
      authProvider: 'local',
    },
    overrideAccess: true,
  })
  const waiterToken = await studentAuth.issueUserSession(waiterStudent)
  const waiterHeaders = {
    'Content-Type': 'application/json',
    Authorization: `JWT ${waiterToken}`,
  }

  // TEST 5: POST /api/v1/waitlist/join
  try {
    const waitlistRes = await fetch(`${origin}/api/v1/waitlist/join`, {
      method: 'POST',
      headers: waiterHeaders,
      body: JSON.stringify({ eventId: apiTestEvent.id }),
    })
    const waitlistJson = await waitlistRes.json()

    const passed = waitlistRes.status === 200 && waitlistJson.success === true

    runTest({
      testId: 'TEST-V1-5-WAITLIST-JOIN',
      name: 'Join Waitlist for Sold Out Event (/api/v1/waitlist/join)',
      endpoint: '/api/v1/waitlist/join',
      method: 'POST',
      expected: 'HTTP 200 with success: true and waitlist confirmation message',
      actual: passed
        ? `HTTP 200: "${waitlistJson.message}"`
        : `Waitlist failed with status ${waitlistRes.status}: ${JSON.stringify(waitlistJson)}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: waitlistJson,
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-5-WAITLIST-JOIN',
      name: 'Join Waitlist for Sold Out Event (/api/v1/waitlist/join)',
      endpoint: '/api/v1/waitlist/join',
      method: 'POST',
      expected: 'HTTP 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // TEST 6: POST /api/v1/tickets/cancel (Triggering FIFO waitlist auto-allocation)
  try {
    // Find testStudent's active ticket
    const ticketDoc = await payload.find({
      collection: 'tickets',
      where: {
        and: [{ student: { equals: testStudent.id } }, { event: { equals: apiTestEvent.id } }],
      },
      limit: 1,
      overrideAccess: true,
    })
    const ticketId = ticketDoc.docs[0]?.id

    const cancelRes = await fetch(`${origin}/api/v1/tickets/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ticketId }),
    })
    const cancelJson = await cancelRes.json()

    // Verify waiterStudent got automatically allocated a ticket
    const waiterTicket = await payload.find({
      collection: 'tickets',
      where: {
        and: [{ student: { equals: waiterStudent.id } }, { event: { equals: apiTestEvent.id } }, { status: { equals: 'active' } }],
      },
      limit: 1,
      overrideAccess: true,
    })

    const passed =
      cancelRes.status === 200 &&
      cancelJson.success === true &&
      waiterTicket.totalDocs === 1

    runTest({
      testId: 'TEST-V1-6-TICKET-CANCEL-AND-FIFO',
      name: 'Ticket Cancellation & FIFO Reallocation (/api/v1/tickets/cancel)',
      endpoint: '/api/v1/tickets/cancel',
      method: 'POST',
      expected: 'HTTP 200, ticket cancelled, seat automatically reallocated to FIFO waiter',
      actual: passed
        ? `HTTP 200: "${cancelJson.message}". Waiter student automatically issued new active ticket code: "${waiterTicket.docs[0]?.code}".`
        : `Cancellation failed with status ${cancelRes.status}: ${JSON.stringify(cancelJson)}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        cancelResponse: cancelJson,
        waiterNewTicket: waiterTicket.docs[0]?.code,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-6-TICKET-CANCEL-AND-FIFO',
      name: 'Ticket Cancellation & FIFO Reallocation (/api/v1/tickets/cancel)',
      endpoint: '/api/v1/tickets/cancel',
      method: 'POST',
      expected: 'HTTP 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // TEST 7: Notifications API (GET, PATCH mark-as-read, POST read-all)
  try {
    // 7A: GET notifications
    const notifsRes = await fetch(`${origin}/api/v1/notifications`, { headers: authHeaders })
    const notifsJson = await notifsRes.json()

    const firstNotif = notifsJson.data?.notifications?.[0]

    // 7B: PATCH mark-as-read
    let patchPassed = false
    if (firstNotif) {
      const patchRes = await fetch(`${origin}/api/v1/notifications/${firstNotif.id}/read`, {
        method: 'PATCH',
        headers: authHeaders,
      })
      const patchJson = await patchRes.json()
      patchPassed = patchRes.status === 200 && patchJson.success === true
    }

    // 7C: Cross-student ownership protection: waiter attempts to read/mark testStudent's notification
    let crossStudentBlocked = false
    if (firstNotif) {
      const crossRes = await fetch(`${origin}/api/v1/notifications/${firstNotif.id}/read`, {
        method: 'PATCH',
        headers: waiterHeaders, // wrong user!
      })
      crossStudentBlocked = crossRes.status === 403
    }

    const passed =
      notifsRes.status === 200 &&
      notifsJson.success === true &&
      Array.isArray(notifsJson.data.notifications) &&
      patchPassed &&
      crossStudentBlocked

    runTest({
      testId: 'TEST-V1-7-NOTIFICATIONS-API',
      name: 'Notifications List, Mark-As-Read & Ownership Protection',
      endpoint: '/api/v1/notifications',
      method: 'GET / PATCH',
      expected: 'HTTP 200 for student notifications, mark read succeeds, unauthorized user blocked with HTTP 403',
      actual: passed
        ? `GET: Returned ${notifsJson.data.notifications.length} notification(s). PATCH: Notification ID ${firstNotif?.id} marked read. Cross-student mutation blocked with HTTP 403 Forbidden.`
        : `Notifications test failed. GET status: ${notifsRes.status}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        getNotifsCount: notifsJson.data?.notifications?.length,
        unreadCount: notifsJson.data?.unreadCount,
        patchMarkReadSuccess: patchPassed,
        crossStudentBlockedWith403: crossStudentBlocked,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-7-NOTIFICATIONS-API',
      name: 'Notifications List, Mark-As-Read & Ownership Protection',
      endpoint: '/api/v1/notifications',
      method: 'GET / PATCH',
      expected: 'HTTP 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  // TEST 8: POST /api/v1/contact
  try {
    const contactPayload = {
      name: 'Campus Representative',
      email: `rep.${tag}@campus.edu`,
      category: 'event-information',
      subject: 'Inquiry regarding venue accessibility and parking',
      message: 'Hello, we would like to confirm accessibility ramp locations for the upcoming technology summit.',
    }

    const contactRes = await fetch(`${origin}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactPayload),
    })
    const contactJson = await contactRes.json()

    // Test validation failure
    const badRes = await fetch(`${origin}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad' }),
    })

    const passed =
      contactRes.status === 200 &&
      contactJson.success === true &&
      Boolean(contactJson.id) &&
      badRes.status === 400

    runTest({
      testId: 'TEST-V1-8-CONTACT-SUPPORT',
      name: 'Support Inquiry & Feedback Submission (/api/v1/contact)',
      endpoint: '/api/v1/contact',
      method: 'POST',
      expected: 'HTTP 200 with saved complaint ID; HTTP 400 with validation errors for invalid input',
      actual: passed
        ? `Valid submission HTTP 200: Complaint ID ${contactJson.id} stored in database. Invalid input rejected with HTTP 400.`
        : `Contact test failed with status ${contactRes.status}: ${JSON.stringify(contactJson)}`,
      status: passed ? 'PASS' : 'FAIL',
      evidence: {
        validStatus: contactRes.status,
        savedComplaintId: contactJson.id,
        invalidStatus: badRes.status,
      },
    })
  } catch (err: any) {
    runTest({
      testId: 'TEST-V1-8-CONTACT-SUPPORT',
      name: 'Support Inquiry & Feedback Submission (/api/v1/contact)',
      endpoint: '/api/v1/contact',
      method: 'POST',
      expected: 'HTTP 200',
      actual: `Failed: ${err.message}`,
      status: 'FAIL',
    })
  }

  const passedTests = tests.filter((t) => t.status === 'PASS').length
  const failedTests = tests.filter((t) => t.status === 'FAIL').length

  return NextResponse.json({
    summary: {
      total: tests.length,
      passed: passedTests,
      failed: failedTests,
      allPassed: failedTests === 0,
      timestamp: new Date().toISOString(),
    },
    tests,
  })
}
