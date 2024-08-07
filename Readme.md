## Details
Code that pulls in option Greeks Value from option chain and can be used for analysis.
Home page - contains code that is extracted every 30 seconds and is as is
Referrential page - assumes a baseline at 9.30 and displays the  difference of the variation with baselines

Market Sentiment can be extrapolated based on these Greek Values

Always read data in correlation with PE and CE , to get an idea of the direction
Conviction increases if both nf and bnf are showing similar sentiment
Use Price action to decide entry once the direction is known for naked positions
Which ever side CE or PE , it should be -ve and absolute value greater than 10 , so for example - 11, -29 etc . Which ever side is negative then check how many times more powerful it is from its counter part. If the relative multiplicative number between ce - pe is like 3 times or more, then no need to wait for getting it to 10
Eg at 10.15 , CE is - 10 and PE is 30 , this means that CE side to buy and also ce is almost 3 time the PE side , so more momemtum types 
CE Theta is lesser than PE theta then it means CE is going up

If both are positive ,  then its straddle day

## Update the Fetch URL details in env file

## Database
SQLlite is used. FOr each of the Index a DB is created
user datasetup.js to make changes to DB. 

## Running
npm install
npm run start
and open the browser to point to localhost

## Config
USERID=
ACCESS_TOKEN=
PORT=3005
INDEX=
EXPIRY=
STRIKES=30
EXCHANGE=NSE
INDEX_EXPIRY_NIFTY=2024-08-08
INDEX_EXPIRY_BANKNIFTY=2024-08-07
INDEX_EXPIRY_FINNIFTY=2024-08-06
INDEX_EXPIRY_MIDCPNIFTY=2024-08-12
DAYS_TO_EXPIRE=
BASELINE_START_TIME=12:05