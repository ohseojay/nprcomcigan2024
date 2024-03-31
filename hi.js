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
                    return dayData.filter((schedule) => schedule.classTime <= 7);
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

// 함수: .ics 파일 생성
 // 함수: .ics 파일 생성
function createICSFile(data) {
    let icsContent = `BEGIN:VCALENDAR
PRODID:-//My Timetable//EN
VERSION:2.0\n`;

    data.forEach((dayData, index) => {
        dayData.forEach((event) => {
            // 목요일의 경우 classTime 7은 없으므로 예외 처리
            if (event.weekday === 3 && event.classTime === 7) {
                return;
            }

            let endTime = '';
            // 목요일은 classTime이 6까지만 생성
            if (event.weekday === 3 && event.classTime === 6) {
                return; // classTime 6은 무시
            }

            // 수요일은 classTime이 5까지만 생성
            if (event.weekday === 2 && event.classTime <= 5) {
                let startTime = getClassTime(event.classTime);
                let endTime = getClassTime(event.classTime + 1);

                // 예외: classTime 5는 13:30부터 시작해서 15:10까지
                if (event.classTime === 5) {
                    endTime = '15:10';
                }

                const startDate = DateTime.fromISO('2024-04-01T' + startTime) // 시작일 (2024-04-01은 월요일)
                    .plus({ days: event.weekday });

                const endDate = DateTime.fromISO('2024-04-01T' + endTime) // 종료일
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

                return; // 반복문 중단
            }

            const startDate = DateTime.fromISO('2024-04-01T' + getClassTime(event.classTime)) // 시작일 (2024-04-01은 월요일)
                .plus({ days: event.weekday });

            // DTEND에 50분 추가한 값을 할당
            const endDate = DateTime.fromISO('2024-04-01T' + getClassTime(event.classTime))
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
    });

    icsContent += 'END:VCALENDAR';

    fs.writeFile('./ohseojay/timetable.ics', icsContent, (err) => {
        if (err) {
            console.error('Error writing .ics file:', err);
        } else {
            console.log('timetable.ics 파일이 성공적으로 생성되었습니다.');
        }
    });
}
