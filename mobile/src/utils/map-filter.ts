import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import { getRestaurantOpenStatus } from '@/utils/opening-hours';
import type { MapQuickFilter } from '@/types/map';

/**
 * Maps cuisine, hero dish, and notes keywords to expressive food emojis.
 */
export function deduceHeroEmoji(crumb: EnrichedUserCrumb): string {
  const textToSearch = [
    crumb.effectiveHeroDish,
    crumb.restaurant?.cuisine,
    crumb.userHeroDishOverride,
    crumb.postAttribution?.heroDish,
    crumb.restaurant?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    textToSearch.includes('pasta') ||
    textToSearch.includes('spaghetti') ||
    textToSearch.includes('tagliatelle') ||
    textToSearch.includes('cacio e pepe') ||
    textToSearch.includes('carbonara') ||
    textToSearch.includes('rigatoni') ||
    textToSearch.includes('ravioli') ||
    textToSearch.includes('gnocchi') ||
    textToSearch.includes('lasagna') ||
    textToSearch.includes('penne')
  ) {
    return '🍝';
  }

  if (
    textToSearch.includes('pizza') ||
    textToSearch.includes('margherita') ||
    textToSearch.includes('slice') ||
    textToSearch.includes('pie') ||
    textToSearch.includes('pizzeria')
  ) {
    return '🍕';
  }

  if (
    textToSearch.includes('bakery') ||
    textToSearch.includes('croissant') ||
    textToSearch.includes('pastry') ||
    textToSearch.includes('bread') ||
    textToSearch.includes('bagel') ||
    textToSearch.includes('donut') ||
    textToSearch.includes('doughnut') ||
    textToSearch.includes('danish') ||
    textToSearch.includes('pain au chocolat')
  ) {
    return '🥐';
  }

  if (
    textToSearch.includes('coffee') ||
    textToSearch.includes('cafe') ||
    textToSearch.includes('café') ||
    textToSearch.includes('espresso') ||
    textToSearch.includes('cappuccino') ||
    textToSearch.includes('latte') ||
    textToSearch.includes('matcha') ||
    textToSearch.includes('tea')
  ) {
    return '☕';
  }

  if (
    textToSearch.includes('sushi') ||
    textToSearch.includes('sashimi') ||
    textToSearch.includes('omakase') ||
    textToSearch.includes('nigiri') ||
    textToSearch.includes('maki') ||
    textToSearch.includes('japanese') ||
    textToSearch.includes('handroll')
  ) {
    return '🍣';
  }

  if (
    textToSearch.includes('bar') ||
    textToSearch.includes('cocktail') ||
    textToSearch.includes('wine') ||
    textToSearch.includes('beer') ||
    textToSearch.includes('pub') ||
    textToSearch.includes('brewery') ||
    textToSearch.includes('speakeasy')
  ) {
    return '🍸';
  }

  if (
    textToSearch.includes('burger') ||
    textToSearch.includes('cheeseburger') ||
    textToSearch.includes('patty') ||
    textToSearch.includes('smashburger')
  ) {
    return '🍔';
  }

  if (
    textToSearch.includes('taco') ||
    textToSearch.includes('tacos') ||
    textToSearch.includes('burrito') ||
    textToSearch.includes('quesadilla') ||
    textToSearch.includes('mexican') ||
    textToSearch.includes('taqueria')
  ) {
    return '🌮';
  }

  if (
    textToSearch.includes('dessert') ||
    textToSearch.includes('ice cream') ||
    textToSearch.includes('gelato') ||
    textToSearch.includes('cake') ||
    textToSearch.includes('chocolate') ||
    textToSearch.includes('cookie') ||
    textToSearch.includes('churros')
  ) {
    return '🍦';
  }

  if (
    textToSearch.includes('ramen') ||
    textToSearch.includes('noodle') ||
    textToSearch.includes('pho') ||
    textToSearch.includes('udon') ||
    textToSearch.includes('soba') ||
    textToSearch.includes('pad thai')
  ) {
    return '🍜';
  }

  if (
    textToSearch.includes('steak') ||
    textToSearch.includes('bbq') ||
    textToSearch.includes('barbecue') ||
    textToSearch.includes('ribs') ||
    textToSearch.includes('brisket') ||
    textToSearch.includes('meat') ||
    textToSearch.includes('steakhouse')
  ) {
    return '🥩';
  }

  if (
    textToSearch.includes('seafood') ||
    textToSearch.includes('fish') ||
    textToSearch.includes('oyster') ||
    textToSearch.includes('lobster') ||
    textToSearch.includes('crab') ||
    textToSearch.includes('shrimp')
  ) {
    return '🦪';
  }

  return '🍴';
}

export function getCrumbPinType(
  crumb: EnrichedUserCrumb,
): 'saved' | 'visited' | 'inbox' {
  if (crumb.isVisited || crumb.status === 'visited') {
    return 'visited';
  }
  if (
    crumb.status === 'inbox' ||
    !crumb.guideIds ||
    crumb.guideIds.length === 0
  ) {
    return 'inbox';
  }
  return 'saved';
}

export function filterCrumbs(
  crumbs: EnrichedUserCrumb[],
  filters: {
    searchQuery: string;
    selectedGuideId: string | null;
    quickFilter: MapQuickFilter;
  },
): EnrichedUserCrumb[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return crumbs.filter((crumb) => {
    // Must have valid coordinates
    if (
      !Number.isFinite(crumb.restaurant?.latitude) ||
      !Number.isFinite(crumb.restaurant?.longitude)
    ) {
      return false;
    }

    // Guide filtering
    if (
      filters.selectedGuideId &&
      (!crumb.guideIds || !crumb.guideIds.includes(filters.selectedGuideId))
    ) {
      return false;
    }

    // Quick filter
    if (filters.quickFilter === 'open_now') {
      const openStatus = getRestaurantOpenStatus(
        crumb.restaurant.regularOpeningHours,
      );
      if (!openStatus.isOpen) {
        return false;
      }
    } else if (filters.quickFilter === 'bookable') {
      const isBookable = Boolean(
        crumb.restaurant.reservationUrl || crumb.restaurant.reservationProvider,
      );
      if (!isBookable) {
        return false;
      }
    } else if (filters.quickFilter === 'visited') {
      const isVisited = crumb.isVisited === true || crumb.status === 'visited';
      if (!isVisited) {
        return false;
      }
    }

    // Search query filtering
    if (query) {
      const name = crumb.restaurant.name?.toLowerCase() || '';
      const address = crumb.restaurant.formattedAddress?.toLowerCase() || '';
      const neighborhood =
        crumb.restaurant.neighborhood?.toLowerCase() ||
        crumb.restaurant.city?.toLowerCase() ||
        '';
      const cuisine = crumb.restaurant.cuisine?.toLowerCase() || '';
      const heroDish = crumb.effectiveHeroDish?.toLowerCase() || '';
      const vibes =
        crumb.postAttribution?.vibeTags?.map((v) => v.toLowerCase()) || [];
      const author = crumb.sourcePost?.authorUsername?.toLowerCase() || '';

      const matches =
        name.includes(query) ||
        address.includes(query) ||
        neighborhood.includes(query) ||
        cuisine.includes(query) ||
        heroDish.includes(query) ||
        author.includes(query) ||
        vibes.some((v) => v.includes(query));

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}
