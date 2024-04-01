const fs = require('fs');
const { DateTime } = require('luxon');
const { v4: uuidv4 } = require('uuid');
const Timetable = require('comcigan-parser');

// Timetable 인스턴스 생성
const timetable = new Timetable();

// 초기화 후 학교 검색
timetable.init()
    .then(() => timetable.search('늘푸른'))
    .then((schoolList) => {
        // 늘푸른고등학교 검색
        const mySchool = schoolList.find((school) => school.name.includes('늘푸른고등학교'));

        if (mySchool) {
            // 학교 설정
            timetable.setSchool(mySchool.code);

            // 1학년 7반 시간표 데이터 조회
            return timetable.getTimetable().then((timetableData) => {
                // 각 요일 데이터 순회
                const filteredData = timetableData[1][7].map((dayData) => {
                    // classTime이 7 이하인 데이터만 필터링
                    return dayData.filter((schedule) => schedule.subject !== '');
                });

                // .ics 파일 생성 함수 호출
                createICSFile(filteredData);
            });
        } else {
            throw new Error('늘푸른고등학교를 찾을 수 없습니다.');
        }
    })
    .catch((error) => {
        console.error('Error:', error.message);
    });

// 함수: classTime을 시간으로 변환
function getClassTime(time) {
    switch (time) {
        case 1:
            return '08:40';
        case 2:
            return '09:40';
        case 3:
            return '10:40';
        case 4:
            return '11:40';
        case 5:
            return '13:30';
        case 6:
            return '14:30';
        case 7:
            return '15:30';
        default:
            return '';
    }
}

//오늘의날짜가져오기^_^

function getToday() {
    // 현재 날짜를 가져오는 함수
    var today = new Date();
    return today;
}

function getWeekday(date) {
    // 주어진 날짜의 요일을 반환하는 함수 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    var weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    var dayIndex = date.getDay();
    return weekdays[dayIndex];
}


function basedate() {
    // 주어진 날짜의 이번 주의 월요일을 반환하는 함수
    var today = getToday();
    var dayOfWeek = today.getDay(); // 오늘의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)

    // 오늘이 월요일 ~ 금요일인 경우
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // 이번 주의 월요일을 구함
        var thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() - (dayOfWeek - 1));
        return thisMonday.toISOString().split('T')[0] + "T"; // ISO 형식으로 변환
    } else if (dayOfWeek == 0) { // 일요일인 경우
        // 다음 주의 월요일을 구함
        var nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (1));
        return nextMonday.toISOString().split('T')[0] + "T"; // ISO 형식으로 변환
    } else { //토요일인 경우
        // 다음 주의 월요일을 구함
        var nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (2));
        return nextMonday.toISOString().split('T')[0] + "T"; // ISO 형식으로 변환
    }
}

// 오늘 날짜 가져오기
var today = getToday();
// 오늘의 요일 가져오기
var weekday = getWeekday(today);

// basedate 함수 호출하여 결과 출력
console.log("오늘은 " + weekday + "요일입니다.");


var nextMonday = basedate();
console.log("basedate 함수를 호출한 결과: " + nextMonday);


// 함수: .ics 파일 생성
function createICSFile(data) {
    let icsContent = '';

    // 요일별로 데이터 처리
    data.forEach((dayData, index) => {
        // 수요일인 경우만 처리
        if (index === 2) {
            icsContent += createWednesdayICS(dayData);
        } else {
            dayData.forEach((event) => {
                // 목요일의 경우 classTime 7은 없으므로 예외 처리
                if (event.weekday === 3 && event.classTime === 7) {
                    return;
                }

                const startDate = DateTime.fromISO(nextMonday + getClassTime(event.classTime)) // 시작일 (날짜가져오기 함수에서 월요일데이터)
                    .plus({ days: event.weekday });

                // DTEND에 50분 추가한 값을 할당
                const endDate = DateTime.fromISO(nextMonday + getClassTime(event.classTime))  //종료일 (날짜가져오기 함수에서 월요일데이터)
                    .plus({ minutes: 50 })
                    .plus({ days: event.weekday });

                // ISO 8601 확장 형식으로 DTSTART와 DTEND 변경 (Z단위 포함)
                const startISO = startDate.toFormat('yyyyMMdd\'T\'HHmmss\'Z\'');
                const endISO = endDate.toFormat('yyyyMMdd\'T\'HHmmss\'Z\'');

                // 이벤트 제목은 데이터의 subject 값으로 설정하고, 교사 값은 무시
                const summary = event.subject || 'No Subject';

                // LOCATION 데이터 없이 형식 맞추기
                icsContent += `BEGIN:VEVENT
UID:${uuidv4()}
DTSTAMP:${DateTime.utc().toISO()}
DTSTART;TZID=Asia/Seoul:${startISO}
DTEND;TZID=Asia/Seoul:${endISO}
SUMMARY:${summary}
END:VEVENT\n`;
            });
        }
    });

    // 마지막에 END:VCALENDAR 추가
    icsContent += 'END:VCALENDAR';

    fs.readFile('./ohseojay/schedule_7CLASS.ics', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading schedule_7CLASS.ics:', err);
        } else {
            // 기존 파일의 END:VCALENDAR 제거
            const newData = data.replace(/END:VCALENDAR/g, '');

            // 기존 파일에 새로운 일정 추가
            const updatedData = newData + icsContent;

            // 수정된 내용을 파일에 씀
            fs.writeFile('./ohseojay/schedule_7CLASS.ics', updatedData, (err) => {
                if (err) {
                    console.error('Error writing schedule_7CLASS.ics:', err);
                } else {
                    console.log('schedule_7CLASS.ics 파일에 일정이 추가되었습니다.');
                }
            });
        }
    });
}

// 함수: 수요일 .ics 파일 생성
function createWednesdayICS(data) {
    let icsContent = '';

    data.forEach((event) => {
        // 수요일은 classTime이 5까지만 생성
        if (event.classTime <= 5) {
            let startTime = getClassTime(event.classTime);
            let endTime = '';

            // classTime 5 예외 처리
            if (event.classTime === 5) {
                startTime = getClassTime(5);
                endTime = '15:10';
            } else {
                startTime = getClassTime(event.classTime);
                endTime = DateTime.fromISO(nextMonday + getClassTime(event.classTime)) // 시작일 (날짜가져오기 함수에서 월요일데이터)
                    .plus({ minutes: 50 })
                    .toFormat('HH:mm');
            }

            const startDate = DateTime.fromISO(nextMonday + startTime) // 시작일 (날짜가져오기 함수에서 월요일데이터)
                .plus({ days: event.weekday });

            const endDate = DateTime.fromISO(nextMonday + endTime) // 종료일
                .plus({ days: event.weekday });

            const startISO = startDate.toFormat('yyyyMMdd\'T\'HHmmss\'Z\'');
            const endISO = endDate.toFormat('yyyyMMdd\'T\'HHmmss\'Z\'');

            const summary = event.subject || 'No Subject';

            icsContent += `BEGIN:VEVENT
UID:${uuidv4()}
DTSTAMP:${DateTime.utc().toISO()}
DTSTART;TZID=Asia/Seoul:${startISO}
DTEND;TZID=Asia/Seoul:${endISO}
SUMMARY:${summary}
END:VEVENT\n`;
        }
    });

    return icsContent;
}
