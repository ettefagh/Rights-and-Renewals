/**
 * bgbTimeline.js
 * Deterministic German Civil Code (BGB) calculation engine for CM-LAB Modern App (M3)
 * Standards:
 * - BGB § 438 Abs. 1 Nr. 3: 24-month statutory warranty
 * - BGB § 477 Abs. 1: 12-month reversed burden of proof cliff (Beweislastumkehr)
 * - BGB § 475e Abs. 1: 4-month suspension of expiry (Ablaufhemmung)
 * - BGB § 188 Abs. 3: Month-end capping rule
 * - BGB § 193: Non-rollover for statutory factual presumption periods
 * - BGB § 309 Nr. 9 lit. b: Max 1-month rolling cancellation notice for subscriptions
 * - BGB § 312k: Statutory online cancellation button mandate
 * - BGH VIII ZR 285/18 (LexFox) safe-harbor legal notice formatting
 */

export class BGBTimelineService {
  /**
   * Determine if a calendar year is a leap year.
   * @param {number} year
   * @returns {boolean}
   */
  static isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Add exact calendar months with BGB § 188 Abs. 3 month-end capping.
   * If purchase occurs on day 31 and target month has fewer days, capped at last day of month.
   * @param {Date|string} startDate
   * @param {number} months
   * @returns {Date}
   */
  static addMonths(startDate, months) {
    const sDate = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
    const year = sDate.getFullYear();
    const month = sDate.getMonth(); // 0-indexed
    const day = sDate.getDate();

    const targetYear = year + Math.floor((month + months) / 12);
    const targetMonth = (month + months) % 12;

    const daysInMonth = [
      31,
      BGBTimelineService.isLeapYear(targetYear) ? 29 : 28,
      31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ][targetMonth];

    const cappedDay = Math.min(day, daysInMonth);
    return new Date(targetYear, targetMonth, cappedDay);
  }

  /**
   * Calculate all statutory milestones for consumer hardware purchase under BGB.
   * @param {Date|string} purchaseDate
   * @returns {Object}
   */
  static calculateMilestones(purchaseDate) {
    const pDate = typeof purchaseDate === 'string' ? new Date(purchaseDate) : new Date(purchaseDate.getTime());
    const cliff12m = this.addMonths(pDate, 12);
    const expiry24m = this.addMonths(pDate, 24);
    const ablaufhemmung_28m = this.addMonths(expiry24m, 4);

    return {
      purchase_date: this.formatIso(pDate),
      cliff_12m_beweislastumkehr: this.formatIso(cliff12m),
      expiry_24m_statutory: this.formatIso(expiry24m),
      ablaufhemmung_28m: this.formatIso(ablaufhemmung_28m)
    };
  }

  /**
   * Evaluate proof burden, status, and remaining days based on current date.
   * @param {Date|string} purchaseDate
   * @param {Date|string} [currentDate]
   * @returns {Object}
   */
  static evaluateStatus(purchaseDate, currentDate = new Date()) {
    const pDate = typeof purchaseDate === 'string' ? new Date(purchaseDate) : new Date(purchaseDate.getTime());
    const cDate = typeof currentDate === 'string' ? new Date(currentDate) : new Date(currentDate.getTime());
    const milestones = this.calculateMilestones(pDate);

    const cliff = new Date(milestones.cliff_12m_beweislastumkehr);
    const expiry = new Date(milestones.expiry_24m_statutory);

    const totalDays = Math.max(1, Math.round((expiry - pDate) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.round((cDate - pDate) / (1000 * 60 * 60 * 24)));
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    const daysToCliff = Math.round((cliff - cDate) / (1000 * 60 * 60 * 24));
    const daysToExpiry = Math.round((expiry - cDate) / (1000 * 60 * 60 * 24));

    let status = 'protected';
    let burdenOfProof = 'seller';
    let urgencyLevel = 'low';

    if (cDate <= cliff) {
      status = daysToCliff <= 45 ? 'warning' : 'protected';
      burdenOfProof = 'seller';
      urgencyLevel = daysToCliff <= 30 ? 'medium_cliff_warning' : 'low';
    } else if (cDate <= expiry) {
      status = 'cliff_warning';
      burdenOfProof = 'consumer';
      if (daysToExpiry <= 7) {
        urgencyLevel = 'urgent_red';
      } else if (daysToExpiry <= 30) {
        urgencyLevel = 'warning_amber';
      } else {
        urgencyLevel = 'medium';
      }
    } else {
      status = 'expired';
      burdenOfProof = 'expired';
      urgencyLevel = 'neutral_gray';
    }

    return {
      status,
      burden_of_proof: burdenOfProof,
      days_to_cliff: daysToCliff,
      days_to_expiry: daysToExpiry,
      urgency_level: urgencyLevel,
      progressPercent
    };
  }

  /**
   * Format a Date object to YYYY-MM-DD ISO 8601 string.
   * @param {Date} date
   * @returns {string}
   */
  static formatIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Generate formal DIN 5008 / BGB § 437 Mängelrüge statutory defect claim notice.
   * @param {Object} params
   * @param {string} params.brandName
   * @param {string} params.itemName
   * @param {Date|string} params.purchaseDate
   * @param {Date|string} [params.defectDate]
   * @param {string} params.defectDescription
   * @param {string} [params.claimType='replacement'] - 'replacement' (Neulieferung) or 'rectification' (Nachbesserung)
   * @returns {Object}
   */
  static generateStatutoryNotice(arg1, arg2, arg3) {
    let brandName, itemName, purchaseDate, defectDate, defectDescription, claimType;

    if (arg1 && typeof arg1 === 'object' && ('brandName' in arg1 || 'defectDescription' in arg1)) {
      brandName = arg1.brandName;
      itemName = arg1.itemName;
      purchaseDate = arg1.purchaseDate;
      defectDate = arg1.defectDate || new Date();
      defectDescription = arg1.defectDescription;
      claimType = arg1.claimType || 'replacement';
    } else {
      const item = arg1 || {};
      brandName = item.merchant || item.brandName || item.brandSlug || 'Händler';
      itemName = item.name || item.itemName || 'Artikel';
      purchaseDate = arg2 || item.purchaseDate || new Date();
      defectDate = new Date();
      defectDescription = arg3 || 'Mangel am Gerät festgestellt.';
      claimType = 'replacement';
    }

    const pDate = typeof purchaseDate === 'string' ? new Date(purchaseDate) : (purchaseDate || new Date());
    const dDate = typeof defectDate === 'string' ? new Date(defectDate) : (defectDate || new Date());
    const evalResult = this.evaluateStatus(pDate, dDate);
    const isWithinCliff = evalResult.burden_of_proof === 'seller';

    const legalClause = isWithinCliff
      ? 'Gemäß § 477 Abs. 1 BGB wird gesetzlich vermutet, dass der Mangel bereits bei Gefahrübergang vorhanden war, da der Mangel innerhalb von 12 Monaten nach Übergabe aufgetreten ist.'
      : 'Der Gewährleistungsanspruch besteht nach § 438 Abs. 1 Nr. 3 BGB für 24 Monate. Der Käufer legt den Nachweis vor, dass der Mangel auf einer vertragswidrigen Beschaffenheit bei Übergabe beruht.';

    const demandRemedy = claimType === 'replacement'
      ? 'binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Neulieferung (§ 439 Abs. 1 Alt. 2 BGB)'
      : 'binnen angemessener Frist von 14 Tagen die Nacherfüllung durch Nachbesserung (§ 439 Abs. 1 Alt. 1 BGB)';

    const germanDossier = [
      'MÄNGELRÜGE GEMÄSS § 437 BGB',
      '',
      `Gegenstand: ${itemName} (${brandName})`,
      `Kaufdatum: ${this.formatIso(pDate)}`,
      `Datum der Mangelanzeige: ${this.formatIso(dDate)}`,
      '',
      'Mangelbeschreibung:',
      defectDescription,
      '',
      'Rechtliche Grundlage:',
      legalClause,
      '',
      'Aufforderung zur Nacherfüllung:',
      `Hiermit fordere ich Sie auf, ${demandRemedy} zu veranlassen.`,
      '',
      'Vorsorglich verweise ich auf die Ablaufhemmung nach § 475e Abs. 1 BGB.',
      '',
      'HINWEIS NACH BGH VIII ZR 285/18 (LexFox): Diese Mängelrüge wurde automatisiert erstellt und stellt keine Rechtsberatung gem. § 2 RDG dar.'
    ].join('\n');

    return {
      item_name: itemName,
      brand_name: brandName,
      statutory_basis: ['BGB § 434', 'BGB § 437', 'BGB § 438', 'BGB § 439', 'BGB § 477', 'BGB § 475e'],
      burden_of_proof: evalResult.burden_of_proof,
      dossier_text_de: germanDossier,
      fullNoticeText: germanDossier,
      valid: true
    };
  }
}
