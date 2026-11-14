/* Market calculations shared by the page and its offline tests. No network requests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GuideMarket = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function savedNames(value, items) {
    if (!Array.isArray(value)) return [];
    var known = new Set(items.map(function (i) { return i.name; }));
    return Array.from(new Set(value.filter(function (n) { return typeof n === "string" && known.has(n); }))).slice(0, 200);
  }
  function select(items, state, saved) {
    var words = String(state.q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    var rows = items.filter(function (i) {
      return (state.cat === "all" || i.cat === state.cat) && i.reports >= Number(state.min || 0) &&
        (!state.saved || saved.has(i.name)) && words.every(function (w) { return i.name.toLowerCase().indexOf(w) >= 0; });
    });
    return rows.sort(function (a, b) {
      if (state.sort !== "name" && (a.reports < 3) !== (b.reports < 3)) return a.reports < 3 ? 1 : -1;
      var delta = 0;
      if (state.sort === "name") return a.name.localeCompare(b.name);
      if (state.sort === "reports") delta = b.reports - a.reports;
      else if (state.sort === "x") delta = (b.x || 0) - (a.x || 0);
      else if (state.sort === "rising" || state.sort === "falling") {
        if ((a.trend == null) !== (b.trend == null)) return a.trend == null ? 1 : -1;
        delta = a.trend == null ? 0 : (state.sort === "rising" ? b.trend.pct - a.trend.pct : a.trend.pct - b.trend.pct);
      } else delta = b.median - a.median;
      return delta || a.name.localeCompare(b.name);
    });
  }
  function page(rows, number, size) {
    size = [25, 50, 100].indexOf(Number(size)) >= 0 ? Number(size) : 50;
    var pages = Math.max(1, Math.ceil(rows.length / size));
    number = Math.max(1, Math.min(pages, Math.floor(Number(number)) || 1));
    var start = (number - 1) * size;
    return { rows: rows.slice(start, start + size), number: number, pages: pages, total: rows.length, start: rows.length ? start + 1 : 0, end: Math.min(start + size, rows.length) };
  }
  function proceeds(unit, quantity, fee) {
    unit = Number(unit); quantity = Number(quantity); fee = Number(fee);
    if (!Number.isSafeInteger(unit) || unit < 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999999 || !Number.isFinite(fee) || fee < 0 || fee > 100 || !Number.isSafeInteger(unit * quantity)) return null;
    var gross = unit * quantity, net = Math.floor(gross * (100 - fee) / 100);
    return { gross: gross, net: net, fee: gross - net };
  }
  function median(values) {
    var sorted=values.slice().sort(function(a,b){return a-b;}), mid=Math.floor(sorted.length/2);
    return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  }
  function flip(input) {
    var cost=proceeds(input.cost,input.quantity,0), sales=input.sales;
    if (input.excluded) return {status:"skip",message:"Not a flip candidate in your workflow: cosmetic coupons, crates, megaphones and pets are excluded."};
    if (!cost || cost.gross<=0) return {status:"incomplete",message:"Enter the real shop price and quantity first."};
    if (input.gear && (!input.rollChecked || !Number.isInteger(input.slots) || input.slots<0 || input.slots>15)) return {status:"incomplete",message:"Verify the same main stats, remaining slots and relevant secondary stats. An item-wide average cannot value this roll."};
    if (!Array.isArray(sales) || !sales.length || sales.length>10 || sales.some(function(n){return !Number.isSafeInteger(n)||n<=0;})) return {status:"incomplete",message:"Add 1-10 confirmed comparable unit sale prices, newest first. Exclude your own purchases and unconfirmed sales."};
    if (!Number.isSafeInteger(input.nextAsk) || input.nextAsk<=1) return {status:"incomplete",message:"Enter the next cheapest competing unit ask, excluding this listing."};
    var resale=Math.floor(Math.min(median(sales.slice(0,5)),input.nextAsk-1));
    var net=proceeds(resale,input.quantity,3), profit=net.net-cost.gross, roi=profit/cost.gross*100;
    var result={status:"review",resale:resale,net:net.net,profit:profit,roi:roi,breakEven:Math.ceil(input.cost/0.97)};
    if (!Number.isFinite(input.age) || input.age<0 || !Number.isSafeInteger(input.budget) || input.budget<0) {result.status="incomplete";result.message="Add the listing age and available budget before treating this as a candidate.";return result;}
    if (input.age>20) {result.status="skip";result.message="Skip: the listing is more than 20 minutes old.";}
    else if (cost.gross>input.budget) {result.status="skip";result.message="Skip: the whole purchase exceeds your available budget.";}
    else if (profit<5000) {result.status="skip";result.message="Skip: estimated total profit is below 5,000 mesos after the 3% fee.";}
    else {
      var priority=input.age<=10 && sales.length===10 && sales.every(function(n){return input.cost<n;}) && input.cost<input.nextAsk && input.daily>=15 && profit>=30000 && roi>=25;
      result.status=priority ? "priority" : "review";
      result.message=priority ? "Priority candidate. Verify the real price, roll and availability in game before buying." : "Candidate to review. These are manually entered comparables, not a live listing check.";
      if (input.badRoll && (profit<30000 || roi<15)) {result.status="review";result.message="Below-base roll: does not meet your 30,000 mesos AND 15% threshold for a top pick.";}
      if (input.age>5)result.message+=" Listing may already be gone.";
      if (!Number.isFinite(input.daily) || input.daily<15)result.message+=" Demand is low or unverified; avoid tying up most of your budget.";
    }
    return result;
  }
  return { savedNames: savedNames, select: select, page: page, proceeds: proceeds, flip: flip };
}));
