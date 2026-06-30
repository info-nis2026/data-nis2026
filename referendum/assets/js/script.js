const API_URL = "https://script.google.com/macros/s/AKfycbwGtAfrfIbW3WIJJ9AT-A6Hijnd1xwkpsaQZ5O8WdeO0wQc_HL0tFD_zs_HX8BS-lX-/exec";

const loader = document.getElementById("loader");
const electionInfo = document.getElementById("election-info");

const successOverlay = document.getElementById("success-overlay");
const timeEl = document.getElementById("time");
const form = document.getElementById("form");
const selectName = document.getElementById("name");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submit-button");

const agree = document.getElementById("agree");
const disagree = document.getElementById("disagree");
const novote = document.getElementById("novote");

let electionData = {};

// -------------------------
// นาฬิกา
// -------------------------

function updateClock() {

    timeEl.textContent = new Date().toLocaleTimeString("th-TH", {
        hour12: false
    });

}

setInterval(updateClock, 1000);

updateClock();

// -------------------------
// วันที่ปัจจุบัน (เวลาไทย)
// -------------------------

function getToday() {

    const now = new Date();

    return (
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0")
    );

}

// -------------------------
// โหลดข้อมูลจาก Apps Script
// -------------------------

async function loadData() {

    try {

        const res = await fetch(API_URL);

        electionData = await res.json();

        console.log(electionData);

        loader.style.display = "none";

        // ยังไม่ถึงวันเลือกตั้ง
        if (getToday() !== electionData.date) {

            form.style.display = "none";

            electionInfo.style.display = "block";

            document.getElementById("vote-date").textContent =
                formatThaiDate(electionData.date);

            document.getElementById("vote-open").textContent =
                electionData.open;

            document.getElementById("vote-close").textContent =
                electionData.close;

            return;

        }

        // โหลดรายชื่อผู้มีสิทธิ์
        selectName.innerHTML =
            '<option value="">-- พิมพ์ค้นหาชื่อ --</option>';

        electionData.citizen.forEach(name => {

            selectName.insertAdjacentHTML(
                "beforeend",
                `<option value="${name}">${name}</option>`
            );

        });

        // สร้าง TomSelect ครั้งเดียว
        if (window.TomSelect && !selectName.tomselect) {

            new TomSelect("#name", {

                create: false,

                placeholder: "พิมพ์ค้นหาชื่อ...",

                maxOptions: 500,

                allowEmptyOption: true

            });

        }

        form.style.display = "flex";

        checkElectionTime();

    }

    catch (err) {

        loader.style.display = "none";

        console.error(err);

        showMessage("ไม่สามารถโหลดข้อมูลได้", "red");

    }

}

loadData();

// -------------------------
// ตรวจเวลาเปิด-ปิดหีบ
// -------------------------

function checkElectionTime() {

    if (!electionData.date) return;

    const now = new Date();

    const [openHour, openMinute] =
        electionData.open.split(":").map(Number);

    const [closeHour, closeMinute] =
        electionData.close.split(":").map(Number);

    const open = new Date();

    open.setHours(openHour, openMinute, 0, 0);

    const close = new Date();

    close.setHours(closeHour, closeMinute, 0, 0);

    if (now < open) {

        submitBtn.disabled = true;

        showMessage("ยังไม่เปิดหีบ", "orange");

        return;

    }

    if (now > close) {

        submitBtn.disabled = true;

        showMessage("ปิดหีบแล้ว", "red");

        return;

    }

    submitBtn.disabled = false;

}

// -------------------------
// เลือกได้เพียงช่องเดียว
// -------------------------

const boxes = document.querySelectorAll(".value");

boxes.forEach(box => {

    box.addEventListener("click", function () {

        boxes.forEach(i => i.value = "");

        this.value = "X";

    });

});

// -------------------------
// ส่งข้อมูล
// -------------------------

form.addEventListener("submit", async function (e) {

    e.preventDefault();

    const checked = [...boxes].filter(i => i.value === "X");

    if (checked.length !== 1) {

        showMessage("กรุณาเลือก 1 ตัวเลือก", "red");

        return;

    }

    if (!selectName.value) {

        showMessage("กรุณาเลือกชื่อ", "red");

        return;

    }

    let result = "";

    if (agree.value === "X") {

        result = "เห็นชอบ";

    }

    else if (disagree.value === "X") {

        result = "ไม่เห็นชอบ";

    }

    else {

        result = "ไม่แสดงความคิดเห็น";

    }

    submitBtn.disabled = true;

    showMessage("กำลังบันทึก...", "#1565c0");

    try {

        // IP
        const ipData = await fetch("https://api.ipify.org?format=json")
            .then(r => r.json());

        const body = new URLSearchParams();

        body.append("name", selectName.value);
        body.append("result", result);
        body.append("ip", ipData.ip);

        console.log(body.toString());

        const res = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: body.toString()

        });

        const text = await res.text();

        console.log("Response :", text);

        const data = JSON.parse(text);

        switch (data.status) {

            case "success":

                showMessage("ลงคะแนนสำเร็จ", "green");

                submitBtn.disabled = true;

                form.style.display = "none";

                successOverlay.style.display = "flex";

                break;

            case "duplicate":

                form.style.display = "none";

                successOverlay.style.display = "flex";

                break;

            case "not_open":

                showMessage("ยังไม่เปิดหีบ", "orange");

                submitBtn.disabled = true;

                break;

            case "closed":

                showMessage("ปิดหีบแล้ว", "red");

                submitBtn.disabled = true;

                break;

            default:

                showMessage(
                    data.message || "เกิดข้อผิดพลาด",
                    "red"
                );

                submitBtn.disabled = false;

                break;

        }

    }

    catch (err) {

        console.error(err);

        showMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "red");

        submitBtn.disabled = false;

    }

});

// -------------------------
// แสดงข้อความ
// -------------------------

function showMessage(text, color) {

    message.style.display = "block";

    message.style.background = color;

    message.style.color = "#fff";

    message.textContent = text;

}

// -------------------------
// แปลงวันที่ไทย
// -------------------------

function formatThaiDate(date) {

    const months = [
        "มกราคม",
        "กุมภาพันธ์",
        "มีนาคม",
        "เมษายน",
        "พฤษภาคม",
        "มิถุนายน",
        "กรกฎาคม",
        "สิงหาคม",
        "กันยายน",
        "ตุลาคม",
        "พฤศจิกายน",
        "ธันวาคม"
    ];

    const d = new Date(date);

    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;

}