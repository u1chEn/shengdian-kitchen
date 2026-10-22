const shapes={
'免开火':'<ellipse cx="26" cy="31" rx="22" ry="13" fill="#d7c8ad"/><ellipse cx="26" cy="29" rx="17" ry="9" fill="#fff4dd"/><path d="M13 25q13-12 26 0" fill="#a7b392"/>',
'电煮锅':'<path d="M8 22h37v23q-18 9-37 0Z" fill="#b88065"/><ellipse cx="26" cy="22" rx="19" ry="6" fill="#ede1c8"/><ellipse cx="26" cy="22" rx="15" ry="3" fill="#b5a58c"/><path d="M3 25h7v9H3zM44 25h6v9h-6z" fill="#9e6e56"/><circle cx="27" cy="38" r="5" fill="#e8d8b8"/>',
'盐':'<path d="M18 14h12l3 8v25H15V22z" fill="#e7e1d0"/><path d="M18 10h12v7H18z" fill="#a7a18c"/><path d="M17 29h14v11H17z" fill="#f9f4e8"/><circle cx="21" cy="13" r="1"/><circle cx="26" cy="13" r="1"/>',
'酱油':'<path d="M21 5h8v13l6 7v25H15V25l6-7z" fill="#705340"/><path d="M20 5h10v7H20z" fill="#a88a66"/><path d="M17 29h16v12H17z" fill="#e7d4ac"/>',
'油':'<path d="M20 6h10v11l5 8v25H15V25l5-8z" fill="#cbb67c"/><path d="M19 5h12v7H19z" fill="#8b886b"/><path d="M18 29h14v12H18z" fill="#efe5bd"/>',
'醋':'<path d="M21 6h8v13l6 6v25H15V25l6-6z" fill="#807158"/><path d="M20 5h10v7H20z" fill="#6f755b"/><path d="M17 30h16v10H17z" fill="#e8ddc4"/>',
'糖':'<path d="M13 17h24v30q-12 7-24 0z" fill="#e3d5b9"/><path d="M11 13h28v7H11z" fill="#bca78c"/><path d="M19 27h12v12H19z" fill="#faf5e9"/>',
'胡椒':'<path d="M18 13q7-6 14 0l-3 8 6 11v17H15V32l6-11z" fill="#92775c"/><path d="M18 7q7-5 14 0v8H18z" fill="#6c6654"/><path d="M18 36h14v9H18z" fill="#bba483"/>',
'炒锅':'<path d="M7 24h30q-1 17-15 17T7 24" fill="#8c8b72"/><path d="M35 24l12-11 3 4-13 11z" fill="#9d7e5c"/><ellipse cx="22" cy="24" rx="15" ry="4" fill="#b6b29a"/>',
'电饭煲':'<rect x="9" y="18" width="34" height="30" rx="10" fill="#e3d9be"/><path d="M10 22q16-20 32 0" fill="#a6ac8b"/><path d="M21 10h12v5H21z" fill="#777b62"/><rect x="20" y="32" width="13" height="9" rx="2" fill="#b8b49a"/>',
'微波炉':'<rect x="5" y="15" width="43" height="32" rx="4" fill="#d8cfb8"/><rect x="9" y="20" width="28" height="21" rx="2" fill="#929780"/><path d="M13 25h20v3H13z" fill="#b5bca4"/><circle cx="42" cy="25" r="3" fill="#9b8c70"/><circle cx="42" cy="36" r="2" fill="#9b8c70"/>',
'空气炸锅':'<path d="M13 18q0-13 13-13t13 13v28q-13 8-26 0z" fill="#a0a58a"/><path d="M17 25h18v20H17z" fill="#d1ccb2"/><path d="M23 29h6v10h-6z" fill="#817861"/><path d="M21 15h10v4H21z" fill="#e7dfc9"/>'};
export function kitchenIcon(name){const el=document.createElement('span');el.className='kitchen-icon';el.setAttribute('aria-hidden','true');el.innerHTML=`<svg viewBox="0 0 52 56" xmlns="http://www.w3.org/2000/svg">${shapes[name]||shapes['盐']}</svg>`;return el}
