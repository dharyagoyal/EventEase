import "dotenv/config";
import mongoose from "mongoose";
import app from "../src/app.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import User from "../src/models/User.js";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run test script in production environment!");
  process.exit(1);
}

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });

let server;
let baseUrl;
const createdUserIds = new Set();
const createdEventIds = new Set();

async function setup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment");
  }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  const host = mongoose.connection.host;
  console.log(`Connected to MongoDB database "${dbName}" on host "${host}" for Phase 2-3 tests`);

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api/v1`;
  console.log(`Test server running at ${baseUrl}`);
}

async function teardown() {
  console.log("\nCleaning up test data...");
  try {
    const eventIdsArray = Array.from(createdEventIds);
    if (eventIdsArray.length > 0) {
      const regDel = await Registration.deleteMany({ event: { $in: eventIdsArray } });
      const eventDel = await Event.deleteMany({ _id: { $in: eventIdsArray } });
      console.log(`Deleted ${regDel.deletedCount} registrations and ${eventDel.deletedCount} events`);
    }

    const userIdsArray = Array.from(createdUserIds);
    if (userIdsArray.length > 0) {
      const userDel = await User.deleteMany({ _id: { $in: userIdsArray } });
      console.log(`Deleted ${userDel.deletedCount} test users`);
    }
  } catch (cleanupErr) {
    console.error("Error during teardown cleanup:", cleanupErr);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log("Cleanup complete and disconnected from MongoDB");
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

async function runTests() {
  try {
    await setup();

    // Create 2 test organizers to verify ownership isolation
    const org1 = await User.create({
      name: "Organizer One",
      email: `org1_${Date.now()}@example.com`,
      password: "hashed_password_1",
    });
    createdUserIds.add(org1._id.toString());
    const token1 = createToken(org1._id.toString());

    const org2 = await User.create({
      name: "Organizer Two",
      email: `org2_${Date.now()}@example.com`,
      password: "hashed_password_2",
    });
    createdUserIds.add(org2._id.toString());
    const token2 = createToken(org2._id.toString());

    console.log("\n--- TEST 1: Analytics Overview - Auth & Empty State ---");

    // 1a: Reject unauthenticated access
    const noAuthRes = await fetch(`${baseUrl}/events/analytics/overview`);
    assert(noAuthRes.status === 401, "GET /events/analytics/overview requires authentication (401)");

    // 1b: Route precedence check - ensure "analytics" wasn't treated as :id
    const noAuthData = await noAuthRes.json();
    assert(noAuthData.message !== "Invalid event ID", "Route precedence verified: /analytics/overview is not captured by /:id");

    // 1c: Empty state for organizer with no events
    const emptyRes = await fetch(`${baseUrl}/events/analytics/overview`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(emptyRes.status === 200, "GET /events/analytics/overview returns 200 for organizer with no events");
    const emptyData = await emptyRes.json();
    assert(emptyData.totalEvents === 0, "totalEvents is 0 when organizer has no events");
    assert(emptyData.totalRegistrations === 0, "totalRegistrations is 0 when organizer has no events");
    assert(emptyData.totalSeatsRemaining === 0, "totalSeatsRemaining is 0 when organizer has no events");
    assert(Array.isArray(emptyData.perEvent) && emptyData.perEvent.length === 0, "perEvent is empty array when organizer has no events");

    console.log("\n--- TEST 2: Analytics Overview - Multiple Events & Aggregation ---");

    const futureDate1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    // Create solo event for Organizer 1 (capacity 10)
    const soloEvent = await Event.create({
      title: "React Workshop & Deep Dive",
      description: "Hands-on React internals",
      venue: "Tech Hall A",
      date: futureDate1,
      organizer: "DevClub",
      createdBy: org1._id,
      capacity: 10,
      registeredCount: 0,
      isTeamEvent: false,
    });
    createdEventIds.add(soloEvent._id.toString());

    // Register 2 solo attendees
    const regSolo1 = await fetch(`${baseUrl}/events/${soloEvent._id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Solo User 1",
        email: "solo1@example.com",
        usn: "1BM22CS001",
        phone: "9876543210",
        yearOfStudy: 3,
      }),
    });
    assert(regSolo1.status === 201, "Registered solo attendee 1");

    const regSolo2 = await fetch(`${baseUrl}/events/${soloEvent._id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Solo User 2",
        email: "solo2@example.com",
        usn: "1BM22CS002",
        phone: "9876543211",
        yearOfStudy: 2,
      }),
    });
    assert(regSolo2.status === 201, "Registered solo attendee 2");

    // Create team event for Organizer 1 (capacity 5 teams)
    const teamEvent = await Event.create({
      title: "AI Hackathon 2026",
      description: "Build AI applications",
      venue: "Auditorium",
      date: futureDate2,
      organizer: "AI Society",
      createdBy: org1._id,
      capacity: 5,
      registeredCount: 0,
      isTeamEvent: true,
      minTeamSize: 2,
      maxTeamSize: 3,
    });
    createdEventIds.add(teamEvent._id.toString());

    // Register 1 team (Leader + 2 members)
    const regTeam1 = await fetch(`${baseUrl}/events/${teamEvent._id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Lead",
        email: "lead@example.com",
        usn: "1BM22AI010",
        phone: "9876543212",
        yearOfStudy: 4,
        teamName: "Neural Ninjas",
        teamMembers: [
          {
            name: "Member One",
            email: "mem1@example.com",
            usn: "1BM22AI011",
            phone: "9876543213",
            yearOfStudy: 4,
          },
          {
            name: "Member Two",
            email: "mem2@example.com",
            usn: "1BM22AI012",
            phone: "9876543214",
            yearOfStudy: 4,
          },
        ],
      }),
    });
    assert(regTeam1.status === 201, "Registered team with 3 members");

    // Also create 1 event for Organizer 2 to test ownership isolation
    const org2Event = await Event.create({
      title: "Organizer 2 Secret Meetup",
      description: "Private organizer 2 event",
      venue: "Room B",
      date: futureDate1,
      organizer: "Other Club",
      createdBy: org2._id,
      capacity: 50,
      registeredCount: 0,
    });
    createdEventIds.add(org2Event._id.toString());

    // Fetch analytics for Organizer 1
    const org1AnalyticsRes = await fetch(`${baseUrl}/events/analytics/overview`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(org1AnalyticsRes.status === 200, "Fetched analytics for Organizer 1");
    const org1Data = await org1AnalyticsRes.json();

    assert(org1Data.totalEvents === 2, `totalEvents is 2 (got ${org1Data.totalEvents})`);
    assert(org1Data.totalRegistrations === 3, `totalRegistrations is 3 (2 solo + 1 team; got ${org1Data.totalRegistrations})`);
    // Event 1: capacity 10 - registered 2 = 8 seatsLeft
    // Event 2: capacity 5 - registered 1 = 4 seatsLeft
    // Total remaining = 8 + 4 = 12
    assert(org1Data.totalSeatsRemaining === 12, `totalSeatsRemaining is 12 (got ${org1Data.totalSeatsRemaining})`);
    assert(org1Data.perEvent.length === 2, "perEvent has 2 items");

    const soloEventStats = org1Data.perEvent.find((e) => e._id === soloEvent._id.toString());
    assert(Boolean(soloEventStats), "Solo event exists in perEvent");
    assert(soloEventStats.title === "React Workshop & Deep Dive", "perEvent title matches");
    assert(soloEventStats.capacity === 10, "perEvent capacity is 10");
    assert(soloEventStats.registered === 2, "perEvent registered is 2");
    assert(soloEventStats.seatsLeft === 8, "perEvent seatsLeft is 8");
    assert(soloEventStats.fillPercent === 20, "perEvent fillPercent is 20");
    assert(soloEventStats.isTeamEvent === false, "perEvent isTeamEvent is false");

    const teamEventStats = org1Data.perEvent.find((e) => e._id === teamEvent._id.toString());
    assert(Boolean(teamEventStats), "Team event exists in perEvent");
    assert(teamEventStats.title === "AI Hackathon 2026", "Team event title matches");
    assert(teamEventStats.capacity === 5, "Team event capacity is 5");
    assert(teamEventStats.registered === 1, "Team event registered is 1");
    assert(teamEventStats.seatsLeft === 4, "Team event seatsLeft is 4");
    assert(teamEventStats.fillPercent === 20, "Team event fillPercent is 20");
    assert(teamEventStats.isTeamEvent === true, "Team event isTeamEvent is true");

    console.log("\n--- TEST 3: Analytics Overview - Server-side Ownership Isolation ---");

    const org2AnalyticsRes = await fetch(`${baseUrl}/events/analytics/overview`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const org2Data = await org2AnalyticsRes.json();
    assert(org2Data.totalEvents === 1, "Organizer 2 sees only their 1 event");
    assert(org2Data.totalRegistrations === 0, "Organizer 2 has 0 registrations");
    assert(org2Data.totalSeatsRemaining === 50, "Organizer 2 has 50 seats remaining");
    assert(org2Data.perEvent[0]._id === org2Event._id.toString(), "Organizer 2 sees only their own event ID");

    console.log("\n--- TEST 4: CSV Export - Authorization & Validation ---");

    // 4a: Reject unauthenticated export
    const noAuthExport = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees/export`);
    assert(noAuthExport.status === 401, "GET /events/:id/attendees/export requires auth (401)");

    // 4b: Reject non-owner export
    const forbiddenExport = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(forbiddenExport.status === 403, "Non-owner cannot export attendees (403)");

    // 4c: Reject invalid ObjectId
    const invalidIdExport = await fetch(`${baseUrl}/events/invalid_id/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(invalidIdExport.status === 400, "Invalid ObjectId returns 400");

    // 4d: Non-existent event
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundExport = await fetch(`${baseUrl}/events/${nonExistentId}/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(notFoundExport.status === 404, "Non-existent event returns 404");

    console.log("\n--- TEST 5: CSV Export - Solo Event Content & Headers ---");

    const soloExportRes = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(soloExportRes.status === 200, "Export returns 200 for owner");
    assert(soloExportRes.headers.get("content-type").includes("text/csv"), "Content-Type is text/csv");
    const contentDisposition = soloExportRes.headers.get("content-disposition");
    assert(Boolean(contentDisposition), "Content-Disposition header is present");
    assert(
      contentDisposition.includes('attachment; filename="react-workshop-deep-dive-attendees.csv"'),
      `Filename is slugified correctly: got ${contentDisposition}`
    );

    const soloExportBuffer = Buffer.from(await soloExportRes.arrayBuffer());
    // Check UTF-8 BOM (0xEF, 0xBB, 0xBF)
    assert(
      soloExportBuffer[0] === 0xEF &&
      soloExportBuffer[1] === 0xBB &&
      soloExportBuffer[2] === 0xBF,
      "CSV begins with UTF-8 BOM (0xEF, 0xBB, 0xBF)"
    );

    const soloCsvText = soloExportBuffer.slice(3).toString("utf-8");
    const soloLines = soloCsvText.split(/\r?\n/).filter(Boolean);
    assert(soloLines.length === 3, `Expected 3 lines (1 header + 2 solo rows), got ${soloLines.length}`);
    assert(
      soloLines[0] === "Team Name,Role,Name,USN,Email,Phone,Year,Registered On",
      `Header matches expected columns: got ${soloLines[0]}`
    );

    const soloRow1 = soloLines[1];
    assert(soloRow1.includes(",Solo,Solo User 1,1BM22CS001,solo1@example.com,9876543210,3,"), "Solo row 1 fields match");
    const soloRow2 = soloLines[2];
    assert(soloRow2.includes(",Solo,Solo User 2,1BM22CS002,solo2@example.com,9876543211,2,"), "Solo row 2 fields match");

    // Check date format DD MMM YYYY (e.g. "24 Oct 2026")
    const dateRegex = /\d{2} [A-Z][a-z]{2} \d{4}$/;
    assert(dateRegex.test(soloRow1), `Registered On is formatted as DD MMM YYYY: ${soloRow1.split(",").pop()}`);

    console.log("\n--- TEST 6: CSV Export - Team Event (Leader + Member Rows) ---");

    const teamExportRes = await fetch(`${baseUrl}/events/${teamEvent._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(teamExportRes.status === 200, "Team event export returns 200");
    const teamDisposition = teamExportRes.headers.get("content-disposition");
    assert(
      teamDisposition.includes('attachment; filename="ai-hackathon-2026-attendees.csv"'),
      `Team event filename is slugified: ${teamDisposition}`
    );

    const teamExportBuffer = Buffer.from(await teamExportRes.arrayBuffer());
    assert(
      teamExportBuffer[0] === 0xEF &&
      teamExportBuffer[1] === 0xBB &&
      teamExportBuffer[2] === 0xBF,
      "Team CSV starts with UTF-8 BOM (0xEF, 0xBB, 0xBF)"
    );

    const teamCsvText = teamExportBuffer.slice(3).toString("utf-8");
    const teamLines = teamCsvText.split(/\r?\n/).filter(Boolean);
    // 1 header + 1 leader + 2 members = 4 rows
    assert(teamLines.length === 4, `Expected 4 rows (1 header + 1 leader + 2 members), got ${teamLines.length}`);

    // Check Leader row
    const leaderRow = teamLines[1];
    assert(leaderRow.startsWith("Neural Ninjas,Leader,Team Lead,1BM22AI010,lead@example.com,9876543212,4,"), "Leader row has Team Name and Role 'Leader'");

    // Check Member rows
    const member1Row = teamLines[2];
    assert(member1Row.startsWith("Neural Ninjas,Member,Member One,1BM22AI011,mem1@example.com,9876543213,4,"), "Member 1 row has Team Name and Role 'Member'");

    const member2Row = teamLines[3];
    assert(member2Row.startsWith("Neural Ninjas,Member,Member Two,1BM22AI012,mem2@example.com,9876543214,4,"), "Member 2 row has Team Name and Role 'Member'");

    console.log("\n--- TEST 7: CSV Export - Backward Compatibility & Missing Fields ---");

    // Simulate an old registration without USN, phone, yearOfStudy
    const oldReg = await Registration.create({
      event: soloEvent._id,
      name: "Old Attendee",
      email: "old.attendee@example.com",
    });

    const oldExportRes = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const oldExportBuffer = Buffer.from(await oldExportRes.arrayBuffer());
    const oldCsvText = oldExportBuffer.slice(3).toString("utf-8");
    const oldLines = oldCsvText.split(/\r?\n/).filter(Boolean);
    const oldRow = oldLines.find((l) => l.includes("old.attendee@example.com"));

    assert(Boolean(oldRow), "Old registration appears in exported CSV");
    assert(!oldRow.includes("undefined"), "Missing fields never output 'undefined'");
    assert(!oldRow.includes("null"), "Missing fields never output 'null'");
    // Expected: ,Solo,Old Attendee,,old.attendee@example.com,,, <date>
    assert(oldRow.includes(",Solo,Old Attendee,,old.attendee@example.com,,,"), "Missing usn, phone, year output as empty cells");

    console.log("\n--- TEST 8: CSV Export - Escaping & Formula Injection Defense ---");

    // Create an event for testing malicious & special character values
    const escapeEvent = await Event.create({
      title: 'Workshop: "Advanced" C++ & C# (Fall, 2026)',
      description: "Testing escaping",
      venue: "Lab 1",
      date: futureDate1,
      organizer: "DevClub",
      createdBy: org1._id,
      capacity: 10,
    });
    createdEventIds.add(escapeEvent._id.toString());

    // Register records with CSV formula characters (=, +, -, @), quotes, commas, newlines
    await Registration.create({
      event: escapeEvent._id,
      name: '=cmd|"/C calc"!A0',
      email: "calc@example.com",
      usn: "+1BM22CS999",
      phone: "-9876543210",
      yearOfStudy: 1,
    });

    await Registration.create({
      event: escapeEvent._id,
      name: "@Hacker, Evil",
      email: "hacker@example.com",
      usn: "1BM22CS888",
      phone: "9876543210",
      yearOfStudy: 2,
    });

    await Registration.create({
      event: escapeEvent._id,
      name: 'Person with "Quotes" and\nNewline',
      email: "quote@example.com",
      usn: "1BM22CS777",
      phone: "9876543210",
      yearOfStudy: 3,
    });

    const escapeExportRes = await fetch(`${baseUrl}/events/${escapeEvent._id}/attendees/export`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const escapeDisposition = escapeExportRes.headers.get("content-disposition");
    assert(
      escapeDisposition.includes('attachment; filename="workshop-advanced-c-c-fall-2026-attendees.csv"'),
      `Slug handles special characters in title: ${escapeDisposition}`
    );

    const escapeExportBuffer = Buffer.from(await escapeExportRes.arrayBuffer());
    const escapeCsvText = escapeExportBuffer.slice(3).toString("utf-8");

    // 8a: Verify '=' formula injection prefix and quote escaping
    assert(
      escapeCsvText.includes(`"\'=cmd|""/C calc""!A0"`),
      "Formula starting with '=' is prefixed with single quote and internal quotes escaped"
    );

    // 8b: Verify '+' prefix on USN
    assert(
      escapeCsvText.includes("'+1BM22CS999"),
      "Value starting with '+' is prefixed with single quote"
    );

    // 8c: Verify '-' prefix on phone
    assert(
      escapeCsvText.includes("'-9876543210"),
      "Value starting with '-' is prefixed with single quote"
    );

    // 8d: Verify '@' prefix and comma escaping
    assert(
      escapeCsvText.includes(`"\'@Hacker, Evil"`),
      "Value starting with '@' is prefixed with single quote and commas escaped with quotes"
    );

    // 8e: Verify double quotes and newline escaping
    assert(
      escapeCsvText.includes(`"Person with ""Quotes"" and\nNewline"`),
      "Cell with double quotes and newline is properly quoted and quotes doubled"
    );

    console.log("\n--- TEST 9: CORS Exposed-Headers Check ---");

    const corsRes = await fetch(`${baseUrl}/events/${escapeEvent._id}/attendees/export`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization",
      },
    });
    const exposeHeaders = corsRes.headers.get("access-control-expose-headers") || "";
    // In preflight or normal response, Content-Disposition is exposed
    const getRes = await fetch(`${baseUrl}/events/${escapeEvent._id}/attendees/export`, {
      headers: {
        Origin: "http://localhost:5173",
        Authorization: `Bearer ${token1}`,
      },
    });
    const getExposeHeaders = getRes.headers.get("access-control-expose-headers") || "";
    assert(
      exposeHeaders.toLowerCase().includes("content-disposition") ||
      getExposeHeaders.toLowerCase().includes("content-disposition"),
      "CORS exposedHeaders includes Content-Disposition"
    );

    console.log("\n--- TEST 10: GET /events/:id/attendees - Extended Fields & Backward Compatibility ---");

    // 10a: Reject unauthenticated request
    const noAuthAttRes = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees`);
    assert(noAuthAttRes.status === 401, "GET /events/:id/attendees requires auth (401)");

    // 10b: Reject non-owner request (ownership check)
    const forbiddenAttRes = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(forbiddenAttRes.status === 403, "Non-owner cannot view event attendees (403)");

    // 10c: Reject invalid ObjectId
    const invalidIdAttRes = await fetch(`${baseUrl}/events/invalid_id/attendees`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(invalidIdAttRes.status === 400, "Invalid ObjectId returns 400 for attendees endpoint");

    // 10d: Non-existent event
    const notFoundAttRes = await fetch(`${baseUrl}/events/${new mongoose.Types.ObjectId()}/attendees`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(notFoundAttRes.status === 404, "Non-existent event returns 404 for attendees endpoint");

    // 10e: Owner fetches solo event attendees (including solo attendees + oldReg)
    const soloAttRes = await fetch(`${baseUrl}/events/${soloEvent._id}/attendees`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(soloAttRes.status === 200, "Owner successfully fetches solo event attendees");
    const soloAttData = await soloAttRes.json();
    assert(soloAttData.success === true, "Response has success: true");
    assert(Array.isArray(soloAttData.data), "Response data is an array");
    assert(soloAttData.count === 3, "Count matches 3 registrations (2 solo + 1 old)");

    const soloUser1 = soloAttData.data.find((a) => a.email === "solo1@example.com");
    assert(Boolean(soloUser1), "Solo user 1 is present");
    assert(soloUser1.name === "Solo User 1", "Solo user 1 has name");
    assert(soloUser1.usn === "1BM22CS001", "Solo user 1 has USN");
    assert(soloUser1.phone === "9876543210", "Solo user 1 has phone");
    assert(soloUser1.yearOfStudy === 3, "Solo user 1 has yearOfStudy");

    // Check backward compatibility for old attendee without usn/phone/yearOfStudy
    const oldUser = soloAttData.data.find((a) => a.email === "old.attendee@example.com");
    assert(Boolean(oldUser), "Old attendee without usn/phone/yearOfStudy is returned");
    assert(oldUser.name === "Old Attendee", "Old attendee has name");
    assert(oldUser.usn === undefined || oldUser.usn === null, "Old attendee usn is undefined/null");
    assert(oldUser.phone === undefined || oldUser.phone === null, "Old attendee phone is undefined/null");
    assert(oldUser.yearOfStudy === undefined || oldUser.yearOfStudy === null, "Old attendee yearOfStudy is undefined/null");

    // 10f: Owner fetches team event attendees
    const teamAttRes = await fetch(`${baseUrl}/events/${teamEvent._id}/attendees`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(teamAttRes.status === 200, "Owner successfully fetches team event attendees");
    const teamAttData = await teamAttRes.json();
    assert(teamAttData.count === 1, "Team event has 1 registration");
    const teamReg = teamAttData.data[0];
    assert(teamReg.teamName === "Neural Ninjas", "Team registration includes teamName");
    assert(teamReg.name === "Team Lead", "Team leader name is present");
    assert(teamReg.email === "lead@example.com", "Team leader email is present");
    assert(teamReg.usn === "1BM22AI010", "Team leader USN is present");
    assert(teamReg.phone === "9876543212", "Team leader phone is present");
    assert(teamReg.yearOfStudy === 4, "Team leader yearOfStudy is present");
    assert(Array.isArray(teamReg.teamMembers) && teamReg.teamMembers.length === 2, "teamMembers array contains 2 members");
    assert(teamReg.teamMembers[0].name === "Member One", "Member 1 has name");
    assert(teamReg.teamMembers[0].usn === "1BM22AI011", "Member 1 has USN");
    assert(teamReg.teamMembers[0].email === "mem1@example.com", "Member 1 has email");
    assert(teamReg.teamMembers[0].phone === "9876543213", "Member 1 has phone");
    assert(teamReg.teamMembers[0].yearOfStudy === 4, "Member 1 has yearOfStudy");
    assert(teamReg.teamMembers[1].name === "Member Two", "Member 2 has name");
    assert(teamReg.teamMembers[1].usn === "1BM22AI012", "Member 2 has USN");

    console.log("\nALL PHASE 2-3 TESTS PASSED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
}

runTests();
