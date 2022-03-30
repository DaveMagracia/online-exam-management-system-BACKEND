# Web-Based Online Examination Management System (BACKEND)

#### Annyeong :heart: :heart: :heart:

After nyong ma clone tong backend sa mga computer nyo, eto mga need nyo gawin:
Nasa pinaka baba yung steps kung pano mag clone/DL

## STEPS:

1. **Bago nyo gawin to, isure nyo na nainstall nyo na nodeJS**
- Dapat same din tayo ng version ng NPM bago kayo tumuloy sa next step. importante na pareparehas tayo ng version para iwas problema :)
- Para makita kung same, bukas kayo cmd and run nyo yung command na `node -v` para makita version ng node, and `npm -v` para sa version ng npm.
- Compare nyo yung version sa nakalagay sa `versions.txt` file. If parehas, pwidi na tumuloy sa next step.

&nbsp;

2. **Buksan nyo command prompt, then navigate kayo sa folder ng project na to kung san nyo man sinave sa computer nyo**.
- Type nyo tong command na to `npm install` tas enter. Iiinstall neto lahat ng dependencies na nasa `package.json` file.
- After install, ipagcompare nyo yung versions ng dependencies sa `package.json` AND sa `versions.txt` (This time, versions na sa backend titignan)
- Sa `package.json` nyo makikita yung lahat ng package na nakainstall sa proj na to pati yung mga version nila. (nasa 'dependencies')
- Yung `versions.txt` ginawa ko para macompare nyo kung same ba ng version yung mga nainstall nyo. Importante kasi na pareparehas taung lahat. okie poh????

&nbsp;

3. **After mag install, gawa kayo ng bagong file sa ROOT directory ng project na to. Pangalanan nyo ng ".env"**.
- Sa loob ng file na yun, icopy paste nyo to:
MONGO_URI=mongodb+srv://dave:magracia0920@nodeexpressproject.h4j1r.mongodb.net/03-TASK-MANAGER?retryWrites=true&w=majority
- Eto yung URI ng Database natin para makaconnect yung server sa database.
- Saaking account yang database. Maiiba pa tong URI pag nakagawa na ng account gamit yung ArTech Email

&nbsp;

4. **Pag tapos icheck if pareparehas ng version. pwede na irun tong backend**
- Sa cmd, run nyo yung command na `npm start`
- wait nyo lang to medyo matagal kasi nag coconnect sa DB
- punta kayo sa browser then type nyo `localhost:5000`
- if may lumabas na "Server is working!" ibig sabihin gumagana server
- btw, if want nyo i-stop yung server pindutin nyo lang CTRL+C sa cmd, then Y

&nbsp;
&nbsp;

## CLONING:
1. **Sa cmd, navigate muna kayo sa folder kung san nyo gusto ilagay yung project na to**
- Run nyo yung command na to `git clone https://github.com/DaveMagracia/online-exam-management-system-BACKEND.git`
- pagka clone, pwede nyo na buksan yung folder sa VS Code then pwede na kau mag code :>>