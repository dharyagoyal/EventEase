import "dotenv/config";

// 1. Refuse to run if NODE_ENV is production
if (process.env.NODE_ENV === "production") {
  console.error("ERROR: Refusing to run test script in production environment (NODE_ENV=production)");
  process.exit(1);
}

import mongoose from "mongoose";
import app from "../src/app.js";
import Event from "../src/models/Event.js";
import Registration from "../src/models/Registration.js";
import User from "../src/models/User.js";
import jwt from "jsonwebtoken";

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });

let server;
let baseUrl;
let testUser;
let testToken;
const createdEventIds = new Set();
let isCleaningUp = false;

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const dbName = mongoose.connection.name;
  const dbHost = mongoose.connection.host;
  console.log(`Connected to MongoDB host: '${dbHost}', database: '${dbName}'`);

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api/v1`;
  console.log(`Test server running at ${baseUrl}`);

  // Create test organizer user
  const email = `test_org_${Date.now()}@example.com`;
  testUser = await User.create({
    name: "Test Organizer",
    email,
    password: "hashedpassword123",
  });
  testToken = createToken(testUser._id.toString());
}

async function teardown() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log("Cleaning up all test events, registrations, and test users...");

  try {
    if (mongoose.connection.readyState === 1) {
      // Find all events created by testUser, plus any tracked IDs
      let allIds = Array.from(createdEventIds);
      if (testUser) {
        const userEvents = await Event.find({ createdBy: testUser._id }).distinct("_id");
        allIds = [...new Set([...allIds, ...userEvents.map((id) => id.toString())])];
      }

      if (allIds.length > 0) {
        await Registration.deleteMany({ event: { $in: allIds } });
        await Event.deleteMany({ _id: { $in: allIds } });
        console.log(`Cleaned up ${allIds.length} event(s) and their registrations`);
      }

      if (testUser) {
        await User.deleteOne({ _id: testUser._id });
        console.log("Cleaned up test user");
      }
    }
  } catch (cleanErr) {
    console.error("Error during teardown cleanup:", cleanErr.message);
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log("Cleanup complete and disconnected from MongoDB");
  }
}

// Register process exit listeners for cleanup on unexpected failure
process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT. Running teardown...");
  await teardown();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM. Running teardown...");
  await teardown();
  process.exit(1);
});

process.on("uncaughtException", async (err) => {
  console.error("\nUncaught Exception. Running teardown:", err);
  await teardown();
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("\nUnhandled Rejection. Running teardown:", reason);
  await teardown();
  process.exit(1);
});

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

    console.log("\n--- TEST 1: Event model & create validation ---");

    // 1a: Description up to 5000 chars
    const longDescription = "A".repeat(4999);
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const soloEventRes = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Solo Tech Talk",
        description: longDescription,
        venue: "Hall A",
        date: futureDate,
        organizer: "Tech Club",
        capacity: 10,
        isTeamEvent: false,
      }),
    });
    const soloEventData = await soloEventRes.json();
    assert(soloEventRes.status === 201, "Solo event created with 5000 char description");
    assert(soloEventData.data.isTeamEvent === false, "isTeamEvent defaults/is false");
    assert(soloEventData.data.minTeamSize === 1, "minTeamSize is 1 for solo event");
    assert(soloEventData.data.maxTeamSize === 1, "maxTeamSize is 1 for solo event");
    const soloEventId = soloEventData.data._id;
    createdEventIds.add(soloEventId);

    // 1b: Team event creation validation: fail if minTeamSize < 2
    const invalidTeamRes1 = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Invalid Team Event 1",
        description: "Test",
        venue: "Hall B",
        date: futureDate,
        organizer: "Tech Club",
        capacity: 10,
        isTeamEvent: true,
        minTeamSize: 1,
        maxTeamSize: 4,
      }),
    });
    assert(invalidTeamRes1.status === 400, "Fails when minTeamSize < 2 for team event");

    // 1c: Team event creation validation: fail if maxTeamSize > 10
    const invalidTeamRes2 = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Invalid Team Event 2",
        description: "Test",
        venue: "Hall B",
        date: futureDate,
        organizer: "Tech Club",
        capacity: 10,
        isTeamEvent: true,
        minTeamSize: 2,
        maxTeamSize: 11,
      }),
    });
    assert(invalidTeamRes2.status === 400, "Fails when maxTeamSize > 10 for team event");

    // 1d: Team event creation validation: fail if minTeamSize > maxTeamSize
    const invalidTeamRes3 = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Invalid Team Event 3",
        description: "Test",
        venue: "Hall B",
        date: futureDate,
        organizer: "Tech Club",
        capacity: 10,
        isTeamEvent: true,
        minTeamSize: 5,
        maxTeamSize: 3,
      }),
    });
    assert(invalidTeamRes3.status === 400, "Fails when minTeamSize > maxTeamSize");

    // 1e: Valid team event creation (teams of 2-4 members)
    const validTeamRes = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Hackathon 2026",
        description: "Build something great in teams of 2 to 4",
        venue: "Lab 3",
        date: futureDate,
        organizer: "CodeIO",
        capacity: 5,
        isTeamEvent: true,
        minTeamSize: 2,
        maxTeamSize: 4,
      }),
    });
    const validTeamData = await validTeamRes.json();
    assert(validTeamRes.status === 201, "Team event created successfully (2-4 members)");
    const teamEventId = validTeamData.data._id;
    createdEventIds.add(teamEventId);

    console.log("\n--- TEST 2: Solo event registration validation ---");

    // 2a: Invalid USN for solo registration
    const soloInvalidUsn = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Solo",
        email: "alice@example.com",
        usn: "INVALID_USN",
        phone: "9876543210",
        yearOfStudy: 3,
      }),
    });
    const soloInvalidUsnData = await soloInvalidUsn.json();
    assert(soloInvalidUsn.status === 400, "Rejects invalid USN for solo event");
    assert(soloInvalidUsnData.message.includes("invalid USN"), "Error message specifies invalid USN");

    // 2b: Invalid phone (not 10 digits)
    const soloInvalidPhone = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Solo",
        email: "alice@example.com",
        usn: "1BM21CS001",
        phone: "12345",
        yearOfStudy: 3,
      }),
    });
    assert(soloInvalidPhone.status === 400, "Rejects invalid phone number");

    // 2c: Invalid yearOfStudy (< 1 or > 4)
    const soloInvalidYear = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Solo",
        email: "alice@example.com",
        usn: "1BM21CS001",
        phone: "9876543210",
        yearOfStudy: 5,
      }),
    });
    assert(soloInvalidYear.status === 400, "Rejects invalid yearOfStudy");

    // 2d: Rejects teamName or teamMembers on solo event
    const soloWithTeamData = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Solo",
        email: "alice@example.com",
        usn: "1BM21CS001",
        phone: "9876543210",
        yearOfStudy: 3,
        teamName: "Solo Team",
      }),
    });
    assert(soloWithTeamData.status === 400, "Rejects teamName on solo event");

    // 2e: Valid solo registration succeeds
    const soloValidRes = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Solo",
        email: "alice@example.com",
        usn: "1bm21cs001", // test lowercase normalization
        phone: "9876543210",
        yearOfStudy: 3,
      }),
    });
    const soloValidData = await soloValidRes.json();
    assert(soloValidRes.status === 201, "Solo registration succeeds with 201");
    assert(soloValidData.data.registration.usn === "1BM21CS001", "USN normalized to uppercase");
    assert(Array.isArray(soloValidData.data.registration.teamMembers) && soloValidData.data.registration.teamMembers.length === 0, "teamMembers is empty array");
    assert(soloValidData.data.registeredCount === 1, "registeredCount is 1");

    // 2f: Duplicate solo registration with same email
    const soloDupEmail = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Clone",
        email: "alice@example.com",
        usn: "1BM21CS002",
        phone: "9876543211",
        yearOfStudy: 2,
      }),
    });
    assert(soloDupEmail.status === 409, "Rejects duplicate email with 409");

    // 2g: Duplicate solo registration with same USN
    const soloDupUsn = await fetch(`${baseUrl}/events/${soloEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob Unique",
        email: "bob@example.com",
        usn: "1BM21CS001",
        phone: "9876543212",
        yearOfStudy: 2,
      }),
    });
    assert(soloDupUsn.status === 409, "Rejects duplicate USN with 409");

    console.log("\n--- TEST 3: Team event registration validation (min 2, max 4) ---");

    // 3a: Team without teamName
    const teamNoName = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "bob.leader@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamMembers: [
          {
            name: "Member Two",
            email: "two@example.com",
            usn: "1BM21IS011",
            phone: "9876543221",
            yearOfStudy: 3,
          },
        ],
      }),
    });
    assert(teamNoName.status === 400, "Rejects team registration missing teamName");

    // 3b: Team too small (0 members in teamMembers, total 1 person < minTeamSize 2)
    const teamTooSmall = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "bob.leader@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamName: "Code Ninjas",
        teamMembers: [],
      }),
    });
    const teamTooSmallData = await teamTooSmall.json();
    assert(teamTooSmall.status === 400, "Rejects team that is too small (1 member < 2)");
    assert(teamTooSmallData.message.includes("Team size must be between 2 and 4 members"), "Clear error message on too small team");

    // 3c: Team too large (4 members in teamMembers, total 5 people > maxTeamSize 4)
    const teamTooLarge = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "bob.leader@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamName: "Too Big Team",
        teamMembers: [
          { name: "M2", email: "m2@example.com", usn: "1BM21IS020", phone: "9876543201", yearOfStudy: 2 },
          { name: "M3", email: "m3@example.com", usn: "1BM21IS021", phone: "9876543202", yearOfStudy: 2 },
          { name: "M4", email: "m4@example.com", usn: "1BM21IS022", phone: "9876543203", yearOfStudy: 2 },
          { name: "M5", email: "m5@example.com", usn: "1BM21IS023", phone: "9876543204", yearOfStudy: 2 },
        ],
      }),
    });
    const teamTooLargeData = await teamTooLarge.json();
    assert(teamTooLarge.status === 400, "Rejects team that is too large (5 members > 4)");
    assert(teamTooLargeData.message.includes("Team size must be between 2 and 4 members"), "Clear error message on too large team");

    // 3d: Member 2 invalid USN error message check
    const member2BadUsn = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "bob.leader@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamName: "Code Ninjas",
        teamMembers: [
          {
            name: "Member Two",
            email: "two@example.com",
            usn: "BAD_USN_HERE",
            phone: "9876543221",
            yearOfStudy: 3,
          },
        ],
      }),
    });
    const member2BadUsnData = await member2BadUsn.json();
    assert(member2BadUsn.status === 400, "Rejects member with invalid USN");
    assert(member2BadUsnData.message === "Member 2: invalid USN", `Exact error message matches prompt requirement: '${member2BadUsnData.message}'`);

    // 3e: Duplicate email within the same team submission
    const teamInternalDupEmail = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "same@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamName: "Duplicate Club",
        teamMembers: [
          {
            name: "Member Two",
            email: "same@example.com",
            usn: "1BM21IS011",
            phone: "9876543221",
            yearOfStudy: 3,
          },
        ],
      }),
    });
    assert(teamInternalDupEmail.status === 400, "Rejects duplicate email within submission");

    // 3f: Duplicate USN within the same team submission
    const teamInternalDupUsn = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Leader Bob",
        email: "bob.leader@example.com",
        usn: "1BM21IS010",
        phone: "9876543220",
        yearOfStudy: 3,
        teamName: "Duplicate USN Club",
        teamMembers: [
          {
            name: "Member Two",
            email: "two@example.com",
            usn: "1BM21IS011",
            phone: "9876543221",
            yearOfStudy: 3,
          },
          {
            name: "Member Three",
            email: "three@example.com",
            usn: "1BM21IS011",
            phone: "9876543222",
            yearOfStudy: 3,
          },
        ],
      }),
    });
    assert(teamInternalDupUsn.status === 400, "Rejects duplicate USN within submission");

    // 3g: Successful team registration: Team Alpha (Leader + 2 members = 3 members, valid in 2-4)
    const teamAlphaRes = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alpha Leader",
        email: "alpha.lead@example.com",
        usn: "1BM22CS101",
        phone: "9876543101",
        yearOfStudy: 3,
        teamName: "Team Alpha",
        teamMembers: [
          {
            name: "Alpha Two",
            email: "alpha.two@example.com",
            usn: "1BM22CS102",
            phone: "9876543102",
            yearOfStudy: 3,
          },
          {
            name: "Alpha Three",
            email: "alpha.three@example.com",
            usn: "1BM22CS103",
            phone: "9876543103",
            yearOfStudy: 3,
          },
        ],
      }),
    });
    const teamAlphaData = await teamAlphaRes.json();
    assert(teamAlphaRes.status === 201, "Team Alpha registered successfully (3 members)");
    assert(teamAlphaData.data.registeredCount === 1, "Capacity check: 1 team registration = 1 seat increment");
    assert(teamAlphaData.data.registration.teamMembers.length === 2, "2 non-leader members stored in teamMembers");

    console.log("\n--- TEST 4: Duplicate checks ACROSS teams ---");

    // 4a: Team Beta tries to register with Alpha Two's email as a member
    const teamBetaDupMemberEmail = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Beta Leader",
        email: "beta.lead@example.com",
        usn: "1BM22EC201",
        phone: "9876543201",
        yearOfStudy: 2,
        teamName: "Team Beta",
        teamMembers: [
          {
            name: "Sneaky Member",
            email: "alpha.two@example.com", // already registered in Team Alpha
            usn: "1BM22EC202",
            phone: "9876543202",
            yearOfStudy: 2,
          },
        ],
      }),
    });
    const teamBetaData = await teamBetaDupMemberEmail.json();
    assert(teamBetaDupMemberEmail.status === 409, "Rejects when member email is already registered in another team");
    assert(teamBetaData.message.includes("alpha.two@example.com"), "Error message identifies the duplicate email");

    // 4b: Team Gamma tries to register with Alpha Leader's USN as leader
    const teamGammaDupLeaderUsn = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Gamma Leader",
        email: "gamma.lead@example.com",
        usn: "1BM22CS101", // Alpha Leader USN
        phone: "9876543301",
        yearOfStudy: 4,
        teamName: "Team Gamma",
        teamMembers: [
          {
            name: "Gamma Two",
            email: "gamma.two@example.com",
            usn: "1BM22EC302",
            phone: "9876543302",
            yearOfStudy: 4,
          },
        ],
      }),
    });
    const teamGammaData = await teamGammaDupLeaderUsn.json();
    assert(teamGammaDupLeaderUsn.status === 409, "Rejects when leader USN is already registered in another team");
    assert(teamGammaData.message.includes("1BM22CS101"), "Error message identifies the duplicate USN");

    // 4c: Successful 2nd team: Team Delta (Leader + 1 member = 2 members, valid in 2-4)
    const teamDeltaRes = await fetch(`${baseUrl}/events/${teamEventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Delta Leader",
        email: "delta.lead@example.com",
        usn: "1BM23AI001",
        phone: "9876543401",
        yearOfStudy: 1,
        teamName: "Team Delta",
        teamMembers: [
          {
            name: "Delta Two",
            email: "delta.two@example.com",
            usn: "1BM23AI002",
            phone: "9876543402",
            yearOfStudy: 1,
          },
        ],
      }),
    });
    const teamDeltaData = await teamDeltaRes.json();
    assert(teamDeltaRes.status === 201, "Team Delta registered successfully (2 members)");
    assert(teamDeltaData.data.registeredCount === 2, "Capacity incremented to 2");

    console.log("\n--- TEST 5: updateEvent guards ---");

    // 5a: Reject reducing capacity below current registeredCount (registeredCount is 2 on teamEventId)
    const reduceCapacityRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        capacity: 1, // registeredCount is 2
      }),
    });
    const reduceCapacityData = await reduceCapacityRes.json();
    assert(reduceCapacityRes.status === 400, "Rejects reducing capacity below registered count");
    assert(reduceCapacityData.message === "Capacity cannot be lower than current registrations", "Exact capacity rejection message");

    // 5b: Reject changing isTeamEvent when registeredCount > 0
    const changeIsTeamRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        isTeamEvent: false,
      }),
    });
    const changeIsTeamData = await changeIsTeamRes.json();
    assert(changeIsTeamRes.status === 400, "Rejects changing isTeamEvent on event with registrations");
    assert(changeIsTeamData.message.includes("Cannot modify team settings"), "Clear error message on isTeamEvent change");

    // 5c: Reject changing minTeamSize when registeredCount > 0
    const changeMinSizeRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        minTeamSize: 3,
      }),
    });
    const changeMinSizeData = await changeMinSizeRes.json();
    assert(changeMinSizeRes.status === 400, "Rejects changing minTeamSize on event with registrations");
    assert(changeMinSizeData.message.includes("Cannot modify team settings"), "Clear error message on minTeamSize change");

    // 5d: Reject changing maxTeamSize when registeredCount > 0
    const changeMaxSizeRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        maxTeamSize: 3,
      }),
    });
    const changeMaxSizeData = await changeMaxSizeRes.json();
    assert(changeMaxSizeRes.status === 400, "Rejects changing maxTeamSize on event with registrations");
    assert(changeMaxSizeData.message.includes("Cannot modify team settings"), "Clear error message on maxTeamSize change");

    // 5e: Allow updating title / venue or increasing capacity on event with registrations
    const updateTitleRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Hackathon 2026 - Updated Title",
        capacity: 20,
      }),
    });
    const updateTitleData = await updateTitleRes.json();
    assert(updateTitleRes.status === 200, "Allows updating non-team fields (title, increased capacity) on event with registrations");
    assert(updateTitleData.data.title === "Hackathon 2026 - Updated Title", "Title was updated successfully");
    assert(updateTitleData.data.capacity === 20, "Capacity was updated to 20");

    // 5f: Allow updating with unchanged team settings (isTeamEvent, minTeamSize, maxTeamSize) on event with registrations
    const updateUnchangedTeamRes = await fetch(`${baseUrl}/events/${teamEventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Hackathon 2026 - Unchanged Team Settings",
        isTeamEvent: true,
        minTeamSize: 2,
        maxTeamSize: 4,
      }),
    });
    const updateUnchangedTeamData = await updateUnchangedTeamRes.json();
    assert(updateUnchangedTeamRes.status === 200, "Allows payload with unchanged isTeamEvent/minTeamSize/maxTeamSize on event with registrations");
    assert(updateUnchangedTeamData.data.title === "Hackathon 2026 - Unchanged Team Settings", "Title was updated with unchanged team settings");
    assert(updateUnchangedTeamData.data.isTeamEvent === true, "isTeamEvent remains true");
    assert(updateUnchangedTeamData.data.minTeamSize === 2, "minTeamSize remains 2");
    assert(updateUnchangedTeamData.data.maxTeamSize === 4, "maxTeamSize remains 4");

    // 5g: Allow updating team settings on an event WITHOUT registrations
    const freshTeamRes = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        title: "Empty Event",
        description: "Empty test event",
        venue: "Hall C",
        date: futureDate,
        organizer: "CodeIO",
        capacity: 10,
        isTeamEvent: true,
        minTeamSize: 2,
        maxTeamSize: 5,
      }),
    });
    const freshTeamData = await freshTeamRes.json();
    const freshTeamId = freshTeamData.data._id;
    createdEventIds.add(freshTeamId);

    const updateFreshTeamRes = await fetch(`${baseUrl}/events/${freshTeamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        minTeamSize: 3,
        maxTeamSize: 6,
      }),
    });
    const updateFreshTeamData = await updateFreshTeamRes.json();
    assert(updateFreshTeamRes.status === 200, "Allows updating team settings on event without registrations");
    assert(updateFreshTeamData.data.minTeamSize === 3, "minTeamSize updated to 3");
    assert(updateFreshTeamData.data.maxTeamSize === 6, "maxTeamSize updated to 6");

    console.log("\nALL TESTS PASSED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    await teardown();
  }
}

runTests();
