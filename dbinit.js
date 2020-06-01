var express = require('express');
var http = require('http');
var serveStatic = require('serve-static');      //특정 폴더의 파일들을 특정 패스로 접근할 수 있도록 열어주는 역할
var path = require('path');
var expressSession = require('express-session');
var expressErrorHandler = require('express-error-handler');
var client=require('cheerio-httpcli');
var mongoose = require('mongoose');



var database;
var userSchema;
var infoModel;


//몽고디비 연결 함수
function connectDB() {
    //localhost 로컬 호스트
    //:27017  몽고디비 포트
    //local db 생성시 만든 폴더 명
    var databaseURL = 'mongodb://localhost:27017/test';
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseURL,{ useNewUrlParser: true });
    database = mongoose.connection;     //db와 연결 시도
    database.on('open',         //db 연결 될때의 이벤트
        function () {
          console.log('data base 연결됨 ' + databaseURL);

            //몽구스를 사용하여 스키마에 데이터를 집어넣는다
            //진행중인 공모전 데이터 저장하는 스키마 구성
            userSchema = mongoose.Schema({
                url:String,
                image: String,
                mainimage:String, //url
                title: String,
                time: String,
                timeend: String, //마감시간
                boss: String, //주관
                count: Number //조회수
            });
            console.log('userSchema 정의함');
            infoModel = mongoose.model('info', userSchema);
            console.log('infoModel 정의함');
        }
    );
            database.on('disconnected',         //db 연결 끊길떄
                function () {
                    console.log('data base 연결 끊어짐');
                }
            );

            database.on('error',         //에러 발생하는 경우
                console.error.bind(console, 'mongoose 연결 에러')
            );
}
//DB연결한다.
connectDB();


    //진행중인 공모전 데이터를 db에 저장하는 함수
    var addUser = function (db, url,image, mimage,title, time,timeend, boss,count,callback) {
        //객체형태로 저장한다.
        var user = new infoModel({ "url":url,"image": image, "mainimage":mimage,"title": title, "time": time,"timeend":timeend,"boss":boss,"count":count});

        //user 정보를 저장한다.
        user.save
        (
            //에러검사
            function (err)
            {
                if (err)
                {
                    callback(err, null);
                    return;
                }
                console.log('사용자 추가 됨');
                callback(null, user);
            }
        );
    };

/*디비저장*/
var urlType=require('url');
//이미지, URL을 덧붙이기 위한 기본값.
var base="https://www.thinkcontest.com";
//가져올 공모전 사이트
var url="https://www.thinkcontest.com/Contest/CateField.html";
var param={};
client.fetch(url,param,function(err,$,res){
    if(err){console.log("client 에러");return;}
    //페이지 전체 HTML 소스를 저장한다.
    var body=$.html();
    //공모전 데이터가 담겨있는 class를 각각 찾는다.
    $(body).find(".contest-banner-list li").each(function(idx){
        //한 번 접근해서 또 접근해서 데이터를 긁어오므로 socketTimeout 에러발생으로 25개씩 가져오기
        if(50<=idx&&idx<75) {
            //접근하는 리스트 중에 img 속성저장
            var aa = $(this).find(".thumb-holder").find("img").attr('src');
            var a = "", b = "", c = "", d = "";a = base + aa;
            //주제 저장
            b = $(this).find("h4").text();
            //시간 저장
            c = $(this).find('p.time-limit').text();
            //주관 저장
            d = $(this).find('p.organizer').text();
            var e = 0;
            //마감시간을 비교하기 위해 끝시간을 따로 빼옴. 7.23~7.25면 7.25데이터 빼옴
            var cc = c.substring(13, 23);
            //각 공모전 데이터가 자세히 담긴 사이트 저장
            var ur = base + $(this).find("a").attr('href');
ㅋ
            if(ur=="https://www.thinkcontest.com/AdsGuide")
                return;
            //사이트에 접근해서 url과 img 따오기.
            client.fetch(ur, param, function (err, $, res) {
                //에러발생 여부
                if (err) {
                    console.log("client 에러" + err);
                    return;
                }
                //접근한 사이트 긁어오기
                var body1 = $.html();
                //링크 긁어오기
                suba = $(body1).find(".type-5").find("tbody").find('.linker').attr('href');
                var img2= $(body1).find('.poster-holder').attr('style');
                //이미지 style 속성 긁어와서 해당되는 img 주소 뺴오기.
                img2=img2.substring(22,img2.length-3);
                var img3="";
                //기본+img 주소 합쳐서 저장.
                img3=base+img2;
                //db에 위에 저장한 변수들 넣어서 최종 db에 값 넣기.
                addUser(database, suba, a,img3, b, c, cc, d, e, function (err, result) {
                    if (err) {
                        console.log('Error!!!');
                        return;
                    }
                })
            })
        }
  })
});

