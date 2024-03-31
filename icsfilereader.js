const readline = require('readline');
const fs = require('fs');

// readline 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// .ics 파일 읽기
fs.readFile('./ohseojay/schedule_7CLASS.ics', 'utf8', function(err, data) {
  if (err) {
    console.log("파일을 읽는 중 오류가 발생했습니다.");
    return console.log(err);
  }

  console.log("수정 전 .ics 파일 내용:");
  console.log(data);

  // 데이터 수정 함수
  function modifyData() {
    rl.question("날짜, 제목, 추가할 제목, 설명을 입력하세요 (e.g., 20240401 X Y Z), 입력을 멈추려면 STOP을 입력하세요: ", function(answer) {
      if (answer.trim().toUpperCase() === 'STOP') {
        // 입력이 "STOP"이면 수정된 내용을 파일에 저장하고 프로그램 종료
        fs.writeFile('./ohseojay/schedule_7CLASS.ics', data, 'utf8', function(err) {
          if (err) {
            console.log("파일을 저장하는 중 오류가 발생했습니다.");
            return console.log(err);
          }
          console.log("수정된 .ics 파일이 성공적으로 저장되었습니다.");
          rl.close();
        });
        return;
      }

      const [date, title, additionalTitle, description] = answer.trim().split(' ');

      // 이벤트 날짜 찾기
      const eventRegex = new RegExp(`DTSTART;TZID=Asia/Seoul:${date}T\\d{6}Z[^]*?END:VEVENT`, 'g');
      const matchedEvents = data.match(eventRegex);

      if (!matchedEvents) {
        console.log(`해당 날짜에 대한 이벤트가 없습니다: ${date}`);
        modifyData(); // 다시 입력 대기
        return;
      }

      // 특이사항 적용
      matchedEvents.forEach(event => {
        if (event.includes(title)) {
          let modifiedEvent = event;
          if (additionalTitle) {
            // 기존 SUMMARY 값을 가져와서 추가할 문자열을 뒤에 추가하여 새로운 SUMMARY 값 생성
            const originalSummary = event.match(/SUMMARY:(.*)/)[1].trim();
            const newSummary = `${originalSummary} (${additionalTitle})`;
            modifiedEvent = modifiedEvent.replace(/SUMMARY:.*/, `SUMMARY:${newSummary}`);
          }
          if (description) {
            // DESCRIPTION 태그를 추가하기 위해 END:VEVENT 이전에 삽입
            modifiedEvent = modifiedEvent.replace('END:VEVENT', `DESCRIPTION:${description}\nEND:VEVENT`);
          }
          data = data.replace(event, modifiedEvent);
        }
      });

      // 수정된 내용 콘솔에 출력
      console.log("수정 후 .ics 파일 내용:");
      console.log(data);

      // 재귀적으로 다음 입력 대기
      modifyData();
    });
  }

  // 데이터 수정 함수 호출
  modifyData();
});
