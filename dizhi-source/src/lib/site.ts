export const school = {
  name: '湖南省地质中学',
  english: 'HUNAN DIZHI MIDDLE SCHOOL',
  address: '湖南省长沙市人民中路168号',
  official: 'https://hndzzx.csedu.gov.cn/',
  authority: 'https://jyj.changsha.gov.cn/',
  source: 'https://www.icswb.com/h/106859/20250627/932256.html',
  checked: '2026-10-29',
};

export function href(path = '') {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
export const articleUrl = (id: string) => href(`news/${id}.html`);
export const dateLabel = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '.');

export const categories = [
  { slug: 'education', name: '教育教学' },
  { slug: 'campus', name: '校园活动' },
  { slug: 'science', name: '科学教育' },
  { slug: 'sports', name: '体育风采' },
  { slug: 'school', name: '学校发展' },
  { slug: 'notices', name: '校务通知' },
];

export const navigation = [
  { key: 'about', label: '学校概况', children: [['学校简介', 'introduction'], ['办学历史', 'history'], ['学校文化', 'culture'], ['校园环境', 'environment'], ['学校荣誉', 'honors']] },
  { key: 'education', label: '教育教学', children: [['课程与教研', 'curriculum'], ['科学教育', 'science'], ['体育与艺术', 'specialties']] },
  { key: 'campus', label: '校园生活', children: [['校园影像', 'gallery'], ['体育活动', 'sports'], ['艺术与社团', 'arts']] },
  { key: 'news', label: '新闻动态', children: [['报道精选', 'reports']] },
  { key: 'admissions', label: '招生信息', children: [['初中招生', 'junior'], ['高中招生', 'senior'], ['常见问题', 'faq']] },
  { key: 'disclosure', label: '党群与公开', children: [['党群建设', 'party'], ['校务公开', 'public']] },
  { key: 'contact', label: '联系我们', children: [['到校指引', 'visit'], ['信息渠道', 'channels']] },
];

export const photos = [
  { id: 'a', title: '树影与校园步道', alt: '湖南省地质中学校内步道，教学楼与树木沐浴在自然光中', position: '50% 50%' },
  { id: 'e', title: '人民中路上的校园', alt: '从人民中路望向湖南省地质中学，校门标识与教学建筑相映', position: '62% 50%' },
  { id: 'c', title: '校门，故事的起点', alt: '湖南省地质中学正门，门楣上是完整的学校名称', position: '50% 50%' },
  { id: 'f', title: '教学建筑的尺度', alt: '湖南省地质中学校门外的教学楼与校园建筑', position: '50% 50%' },
  { id: 'b', title: '校训，写在日常里', alt: '校园墙面上的严格、勤奋、求实、创新校训及树影', position: '50% 50%' },
];
export const photoSource = (id: string) => `https://commons.wikimedia.org/wiki/File:Hunan_Dizhi_Middle_School_23_July_2024${id}.jpg`;
