var express = require('express');
var http = require('http');
var serveStatic = require('serve-static');      //특정 폴더의 파일들을 특정 패스로 접근할 수 있도록 열어주는 역할
var path = require('path');
var ejs=require('ejs');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var expressErrorHandler = require('express-error-handler');
var multer = require('multer'); //multer 모듈을 추가시킴
var fs = require('fs');
//몽구스 모듈 사용
var mongoose = require('mongoose');



var database;
//스키마 변수 정의
var userSchema;
var infoSchema;
var info2Schema;
//모델 변수 정의
var userModel;
var infoModel;
var info2Model;

//몽고디비에 연결 ,  보통 웹서버 만든 직후 연결 , DB 먼저 연결 되도 상관 없음
//먼저 db를 가져온다
function connectDB() {
  //localhost 로컬 호스트
  //:27017  몽고디비 포트
  //local db 생성시 만든 폴더 명
  var databaseURL = 'mongodb://localhost:27017/test';

    mongoose.Promise = global.Promise;
    mongoose.connect(databaseURL,{ useNewUrlParser: true });
    mongoose.set('useFindAndModify', false);
  database = mongoose.connection;     //db와 연결 시도

    //db 연결 될때의 이벤트
  database.on('open',
      function ()
      {
        console.log('data base 연결됨 ' + databaseURL);

        //회원정보를 저장하는 스키마 구성. "id, 비밀번호, 이름"
        userSchema = mongoose.Schema({
          id: String,
          passwords: String,
          name: String,
        });
        //진행중인 공모전 정보가 담겨있는 스키마
        infoSchema =mongoose.Schema({
            url:String,
            image: String,
            mainimage:String,
            title: String,
            time: String,
            timeend: String,
            boss: String,
            count: Number
        });
          //지난 공모전 정보가 담겨있는 스키마
          info2Schema =mongoose.Schema({
              url:String,
              image: String,
              title: String,
              boss: String,
          });

        //컬렉션과 스키마를 연결시킴
        userModel = mongoose.model('users', userSchema);
        infoModel=mongoose.model('info',infoSchema);
        info2Model=mongoose.model('info2',info2Schema);
        console.log('userModel 정의함');
      }
  );
   //db 연결 끊길떄 메세지 확인
  database.on('disconnected',
      function () {
        console.log('data base 연결 끊어짐');
      }
  );
    //에러 발생하는 경우 메세지 확인
  database.on('error',
      console.error.bind(console, 'mongoose 연결 에러')
  );
}

//express 서버 객체
var app = express();
//포트번호 3000번설정
app.set('port', 3000);

// '/'를 통해 특정폴더를 지정함.
app.use(serveStatic(path.join('/', __dirname, '/')));
app.use(serveStatic(path.join(__dirname, '/')));

//ejs 엔진을 사용 설정
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);


var bodyParser_post = require('body-parser');       //post 방식 파서
//post 방식 일경우 begin
//post 의 방식은 url 에 추가하는 방식이 아니고 body 라는 곳에 추가하여 전송하는 방식
app.use(bodyParser_post.urlencoded({ extended: false }));            // post 방식 세팅
app.use(bodyParser_post.json());                                     // json 사용 하는 경우의 세팅
//post 방식 일경우 end


//쿠키와 세션을 미들웨어로 등록한다
app.use(cookieParser());

//세션 환경 세팅
//세션은 서버쪽에 저장하는 것
app.use(expressSession({
  secret: 'my key',           //세션에 세이브 정보를 저장할때 할때 파일을 만들꺼냐 , 아니면 미리 만들어 놓을꺼냐 등에 대한 옵션들
  resave: true,
  saveUninitialized: true
}));

/*logout*/
app.get('/logout',(req,res)=>{
    //로그아웃이 될 경우 session 데이터 파괴
    req.session.destroy(function(err){
        if(err)console.log('logout 에러 : ', err);

        //팝업창으로 로그아웃 메세지 띄어주기
        res.send('<script>alert("로그아웃 됐습니다.");location.href="/";</script>');

        //로그아웃 후에 메인페이지로 들어가기.
        res.render('index1',{});
    });
});

//로그인 페이지로 접근
app.get('/login', (req, res) => {
    res.render('login', {error_msg:false
    });
});
//회원가입 페이지로 접근
app.get('/register', (req, res) => {
    res.render('register', {
    })
});

//진행중인 공모전 페이지로 접근
app.get('/current', (req, res) => {
    //진행중인 공모전 DB에 연결.
    infoModel.find(function (err, docs) {
        //진행중 공모전 페이지에 session 데이터와 db 값을 전달해줌
            res.render('current', {
                userid: req.session.name, list: docs
            });
        });
});

//지난 공모전 페이지로 접근
app.get('/previous', (req, res) => {
    //지난 공모전 DB에 연결.
    info2Model.find(function (err, docs) {
        //지난 공모전 페이지에 session 데이터와 db 값을 전달해줌
        res.render('previous', {
            userid: req.session.name, list: docs
        });
    });
});

/*포트폴리오 양식 페이지 불러온다*/
app.get('/portfolio', (req, res) => {
    res.render('portfolio', {userid:req.session.name
    })
});
/*포토폴리오 share 페이지 불러오기 및 서버에 있는 파일 리스트 불러온다*/
app.get('/portfolioShare', (req, res) => {
    var Folder = './uploads'
    var ext = [];
    fs.readdir(Folder, function(error, filelist){
        /*파일 리스트를 불러오기 위한 작업*/
        for(var i=0;i<filelist.length;i++){
            /*확장자명만 가져오기 위해 split함수를 이용한다*/
            let array = filelist[i].split('.');
            ext[i] = array[1]; //array[1]에는 확장자명만 있다
        }

        res.render('portfolioShare', {userid:req.session.name,fileid:filelist,ext:ext
        })
    })
});

//라우트를 미들웨어에 등록하기 전에 라우터에 설정할 경로와 함수를 등록한다
//라우터를 사용 (특정 경로로 들어오는 요청에 받아줌)
var router = express.Router();

//action인 로그인페이지에서 로그인 할 때
router.route('/processlogin').post(
    function (req, res) {
      //post나 get 방식에 의해 전달되는 데이터를 저장하기 (ID)
      var paramID = req.body.id || req.query.id;
      //post나 get 방식에 의해 전달되는 데이터를 저장하기 (Password)
      var paramPW = req.body.passwords || req.query.passwords;
      //데이터베이스가 연결 되어있으면.
      if (database) {
          //밑에 함수를 정의했는데 파라미터에 데이터베이스와 id, 비밀번호 전달
        authUser(database, paramID, paramPW,
            function (err, docs) {
              if (database) {
                  //에러메세지 출력
                if (err) {
                  console.log('Error!!!');
                  res.writeHead(200, { "Content-Type": "text/html;characterset=utf8" });
                  res.write('<h1>에러발생</h1>');
                  res.end();
                  return;
                }
                //로그인 성공할 때
                if (docs) {
                  //session에 이름 저장하기.
                    req.session.name=docs[0].name;
                    //유저 DB 를 찾아서 DB값 전달해주기.
                    infoModel.find(function (err, docss) {
                        //메인 페이지에 연결해서 userid에는 session 값, list에는 로그인 DB값 전달해주기.
                        res.render('index1', {
                            userid: req.session.name, list: docss
                        });
                    });
                }
                //로그인이 실패하면
                else {
                    //login 페이지 연결해서 "아이디 비빌번호 메세지도 보내준다."
                    res.render('login',{error_msg: "아이디,비밀번호 틀렸습니다."});
                }

              }
              //DB연결 안될 때.
              else {
                console.log('DB 연결 안됨');
                res.writeHead(200, { "Content-Type": "text/html;characterset=utf8" });
                res.write('<h1>databasae 연결 안됨</h1>');
                res.end();
              }
            }
        );
      }
    }
);

//ajax로 받은 processupdate를 통해 조회수 업데이트
router.route('/processupdate').post(
    function (req, res) {
        //데이터베이스가 연결되어 있따면
        if (database) {
            console.log("데이터변경 실행");
            //진행중인 공모전 db 업데이트 시킨다.
            infoModel.updateOne(
                { url: req.body.url }, //누른 공모전 url을 통해서 확인
                { $inc: { count:1}}, //increment 속성을 줘서 count:1을 통해 하나씩 증가시킨다.
                { new: true }, //결과 반환
            function(err,result){
                if(err){
                    throw err;
                }
            });
        }
    }
);

//회원가입 할 때 연결한다.
router.route('/processaddUser').post(
    function (req, res) {
        //post, get 방식으로 아이디 비밀번호 이름을 저장한다.
        var paramID = req.body.id || req.query.id;
        var paramPW = req.body.passwords || req.query.passwords;
        var paramName = req.body.name || req.query.name;

        //데이터베이스가 있다면
        if (database) {
            //adduser 추가함수 실행
            addUser(database, paramID, paramPW, paramName,
                function (err, result) {
                //에러발생
                    if (err) {
                        console.log('Error!!!');
                        res.writeHead(200, { "Content-Type": "text/html;characterset=utf8" });
                        res.write('<h1>에러발생</h1>');
                        res.end();
                        return;
                    }
                    //추가가 된다면
                    if (result) {
                        //회원가입 메세지 출력
                        res.send('<script>alert("회원가입이 완료되었습니다.");location.href="/";</script>');
                        //메인페이지로 이동
                        res.render('index1',{});
                    }
                    //아니라면
                    else {
                        console.log('추가 안됨 Error!!!');
                        res.writeHead(200, { "Content-Type": "text/html;characterset=utf8" });
                        res.write('<h1>can not add user</h1>');
                        res.write('<a href="/login.html"> re login</a>');
                        res.end();
                    }
                }
            );
        }
        //데이터베이스 연결 안될 때
        else {
            console.log('DB 연결 안됨');
            res.writeHead(200, { "Content-Type": "text/html;characterset=utf8" });
            res.write('<h1>databasae 연결 안됨</h1>');
            res.end();
        }

    }
);
/*파일업로드*/
module.exports = router;

app.use('/', router);
var storage = multer.diskStorage({
    destination: function(req, file, callback){ /*업로드 파일을 저장하기 위한 경로를 설정한다*/
        callback(null, 'uploads/')
    },
    filename: function(req, file, callback){ /*업로드 할 파일명을 설정한다*/
        /*업로드 할 파일명 뒤에 Date.now를 덧붙여 파일을 업로드할 때 중복해서 업로드할 수 있도록 한다.*/
        let array = file.originalname.split('.'); //파일이름과 확장자명으로 쪼갠다
        array[0] = array[0] + '_'; //파일이름 뒤에 _를 두고 뒤에 Date.now를 두기 위함이다
        array[1] = '.' + array[1]; // .확장자명 조합한다

        array.splice(1, 0, Date.now().toString()); // 파일이름_Date.now() 식으로 파일을 업로드 한다, Date.now()는 시간이 바뀌면 계속 바뀐다
        var result = array.join('');
        callback(null, result); //파일 이름을 callback한다

    }
});

var upload = multer({
    /*업로드 가능한 파일 크기를 설정한다.*/
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 파일 사이즈를 제한한다
    }
});

router.route('/portfolioShare').post(upload.array('share',1),function(req,res) {
    /*포트폴리오 공유 페이지에 접근해 파일 리스트와 확장자 정보를 전달한다*/
    var Folder = './uploads' //서버의 uploads 폴더에서 파일리스트를 가져오기 위해 선언한다.

    fs.readdir(Folder, function(error, filelist,file){ //파일 리스트를 읽어온다.
        var ext = [];
        for(var i=0;i<filelist.length;i++){
            /*파일 목록에 있는 확장자 정보를 ext 배열에 담는다*/
            let array = filelist[i].split('.');

            ext[i] = array[1]; //확장자 정보를 ext 배열에 담는다
        }
        res.render('portfolioShare',{userid: req.session.name,fileid: filelist,ext:ext}); // 파일 업로드와 확장자 정보를 전달해준 후에 원래 페이지로 이동한다.
    });

});

// localhost 3000 에 들어가면 여기로 연결
app.get('/', (req, res) => {
    // 현재 진행중인 공모전 DB를 통해서
    infoModel.find(function (err, docs) {
        //메인페이지로 연결한다. 메인페이지에 session 데이터와 db 리스트 저장하기
        res.render('index1', {
            userid: req.session.name, list: docs
        });
    });
});

//마감순 기준으로 정렬하기
app.get('/processCount', (req, res) => {
    //마감순 기준으로 오름차순해서 db 값을 들고온다.
    infoModel.find().sort({timeend:"asc"}).exec(function (err, docs) {
        //진행중인 페이지 그대로 들어가서 정렬된 db값과 session 을 전달해준다.
        res.render('current', {
            userid: req.session.name, list: docs
        });
    });
});
//조회순 기준으로 정렬하기
app.get('/processClick', (req, res) => {
    //db 를 접근해 조회수를 내림차순하여 정렬해서 db값을 들고온다
    infoModel.find().sort({count:"desc"}).exec(function (err, docs) {
        //진행중인 페이지 그대로 들어가서 정렬된 db값과 session 을 전달해준다.
        res.render('current', {
            userid: req.session.name, list: docs
        });
    });
});
//이름순 기준으로 정렬하기
app.get('/processName', (req, res) => {
    //db 를 접근해 이름순으로 데이터를 정렬해서 db값을 들고온다
    infoModel.find().sort({title:"asc"}).exec(function (err, docs) {
        //진행중인 페이지 그대로 들어가서 정렬된 db값과 session 을 전달해준다.
        res.render('current', {
            userid: req.session.name, list: docs
        });
    });
});
//이름순 기준으로 정렬하기
app.get('/process1Name', (req, res) => {
    //db 를 접근해 이름순으로 데이터를 정렬해서 db값을 들고온다
    info2Model.find().sort({title:"asc"}).exec(function (err, docs) {
        //지난 공모전 페이지에 들어가서 정렬된 db값과 session 을 전달해준다.
        res.render('previous', {
            userid: req.session.name, list: docs
        });
    });
});
//일반순으로 정렬하기
app.get('/processGeneral', (req, res) => {
    //진행중 공모전 db를 아무 정렬없이 저장된 데이터 그대로 들고온다
    infoModel.find(function (err, docs) {
        //진행중 페이지에 접근한다.
        res.render('current', {
            userid: req.session.name, list: docs
        });
});
});
//일반순으로 정렬하기
app.get('/process1General', (req, res) => {
    //진행중 공모전 db를 아무 정렬없이 저장된 데이터 그대로 들고온다
    info2Model.find(function (err, docs) {
        //지난 공모전 페이지에 접근한다.
        res.render('previous', {
            userid: req.session.name, list: docs
        });
    });
});

app.get('/download/:id', function(req,res){
    /*포트폴리오 양식 페이지와 포트폴리오 공유 페이지에서 요청한 파일을 uploads 폴더에 있으면 다운로드 한다 */
    var filename = req.params.id;
    filepath = __dirname + "/uploads/" + filename;
    res.download(filepath);
});
//그렇지 않으면 순서상 라우터 이외에 다른것이 먼저 실행될 수 있다
app.use('/', router);       //라우트 미들웨어를 등록한다


//로그인 가능하게 하는 함수
var authUser = function (db, id, password, callback) {
  //회원 값이 담겨있는 모델에서 id, password 찾기.
  userModel.find({ "id": id, "passwords": password },
      function (err, docs)
      {
          //기타 에러가 있다면 함수 실행
        if (err) {
          callback(err, null);
          return;
        }
        //db에 데이터를 찾는다면 데이터 전달해줌.
        if (docs.length > 0) {
          console.log('find user [ ' + docs + ' ]');
          callback(null, docs);
        }
        //db에 데이터가 없다면 메세지 출력
        else {
          console.log('can not find user [ ' + docs + ' ]');
          callback(null, null);
        }
      }
  );

};


//회원가입 할 때 유저 추가하는 함수
var addUser = function (db, id, passwords, name, callback) {
  //id, pw, name으로 구성된 모델을 만들어 저장한다.
  var user = new userModel({ "id": id, "passwords": passwords, "name": name });
  //user 정보를 저장하는 함수
  user.save
  (
      function (err)
      {
          //에러발생시 실행
        if (err)
        {
          callback(err, null);
          return;
        }
        console.log('사용자 추가 됨');
        //user db를 보낸다.
        callback(null, user);
      }
  );
};

//404 에러 코드가 발생하면 해당 페이지를 보여주는 예외 미들웨어
var errorHandler = expressErrorHandler(
    { static: { '404': './public/404.html' } }
);

app.use(expressErrorHandler.httpError(404));
app.use(expressErrorHandler);

//웹서버를 app 기반으로 생성
var appServer = http.createServer(app);
appServer.listen(app.get('port'),
    function () {
      console.log('express 웹서버 실행' + app.get('port'));
        //DB 연결 , DB 연결 먼저해도 상관 없음
      connectDB();
    }
);




