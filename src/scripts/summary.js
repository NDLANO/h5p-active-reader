import 'jquery-circle-progress';
import Colors from './colors';

class Summary extends H5P.EventDispatcher {

  /**
   * @class
   * @param {object} config Configuration.
   * @param {object} parent Parent instance.
   * @param {object} chapters Chapters.
   */
  constructor(config, parent, chapters) {
    super();
    this.parent = parent;
    this.behaviour = config.behaviour;
    this.l10n = config.l10n;
    this.chapters = chapters || [];

    this.subContentId = 'summary';
    this.wrapper = null;
    this.summaryMenuButton = this.createSummaryButton();

    this.filterActionAll = 'all';
    this.filterActionUnanswered = 'unanswered';
    this.bookCompleted = false;
    this.tempState = JSON.stringify(
      this.parent.previousState?.chapters ?? this.getChapterStats()
    );

    parent.on('bookCompleted', (event) => this.setBookComplete(event.data.completed));
    parent.on('toggleMenu', () => {
      const footer = document.querySelector('.h5p-interactive-book-summary-footer');
      if ( footer && this.bookCompleted ) {
        if ( this.parent.isMenuOpen() ) {
          footer.classList.add('menu-open');
        }
        else {
          footer.classList.remove('menu-open');
        }
      }
    });
  }

  /**
   * Set book completion.
   * @param {boolean} complete True for complete. False for incomplete.
   */
  setBookComplete(complete) {
    let summaryFooter = this.parent.mainWrapper ?
      this.parent.mainWrapper[0].querySelector('.h5p-interactive-book-summary-footer') :
      null;
    if (!summaryFooter && this.parent.isSmallSurface()) {
      summaryFooter = document.createElement('div');
      summaryFooter.classList.add('h5p-interactive-book-summary-footer');

      summaryFooter.appendChild(this.createSummaryButton());
      this.parent.mainWrapper.append(summaryFooter);
    }
    if (summaryFooter && complete) {
      setTimeout(() => summaryFooter.classList.add('show-footer'), 0);
    }

    this.bookCompleted = complete;
    Array.from(document.querySelectorAll('.h5p-interactive-book-summary-menu-button'))
      .forEach((button) => button.setAttribute('data-book-completed', complete.toString()));
  }

  /**
   * Set chapters for the summary
   * @param {object[]} chapters Chapters.
   */
  setChapters(chapters) {
    this.chapters = Array.isArray(chapters) ? chapters : [];
  }

  /**
   * Enable/disable the summary button
   * @param {boolean} disabled Set disabled state.
   */
  setSummaryMenuButtonDisabled(disabled = true) {
    this.summaryMenuButton.disabled = disabled;
  }

  /**
   * Apply the filter of resources in the summary
   * @param {string} filter Filter option.
   */
  setFilter(filter) {
    const overviewList = this.wrapper.querySelector('.h5p-interactive-book-summary-overview-list');
    const sectionList = Array.from(overviewList.querySelectorAll('.h5p-interactive-book-summary-overview-section'));
    sectionList.forEach((section) => {
      section.classList.remove('h5p-interactive-book-summary-top-section');
      section.classList.remove('h5p-interactive-book-summary-bottom-section');
    });

    const emptyContainer = overviewList.querySelector('.h5p-interactive-book-summary-overview-list-empty');
    emptyContainer.style.display = 'none';
    if (filter === this.filterActionUnanswered) {
      overviewList.classList.add('h5p-interactive-book-summary-overview-list-only-unanswered');
      const filteredSectionList = sectionList.filter((section) => !section.classList.contains('h5p-interactive-book-summary-no-interactions'));
      if (filteredSectionList.length) {
        filteredSectionList[0].classList.add('h5p-interactive-book-summary-top-section');
        filteredSectionList[filteredSectionList.length - 1].classList.add('h5p-interactive-book-summary-bottom-section');
      }
      else {
        emptyContainer.style.display = 'block';
      }
    }
    else if (filter === this.filterActionAll) {
      overviewList.classList.remove('h5p-interactive-book-summary-overview-list-only-unanswered');
    }
    setTimeout(() => this.trigger('resize'), 1);
  }

  /**
   *  Create a "Summary & Submit" button
   * @returns {HTMLButtonElement} Summary button.
   */
  createSummaryButton() {
    const button = document.createElement('button');
    button.classList.add('h5p-interactive-book-summary-menu-button');
    button.onclick = () => {
      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: 'h5p-interactive-book-chapter-summary',
        section: 'top'
      };
      this.parent.trigger('newChapter', newChapter);
      if (this.parent.isMenuOpen() && this.parent.isSmallSurface()) {
        this.parent.trigger('toggleMenu');
      }
    };

    const paperIcon = document.createElement('span');
    paperIcon.classList.add('h5p-interactive-book-summary-icon');
    paperIcon.classList.add('icon-paper');
    paperIcon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.classList.add('h5p-interactive-book-summary-text');
    text.innerHTML = this.l10n.summaryAndSubmit;

    const arrowIcon = document.createElement('span');
    arrowIcon.classList.add('h5p-interactive-book-summary-menu-button-arrow');
    arrowIcon.classList.add('icon-up');
    arrowIcon.setAttribute('aria-hidden', 'true');

    button.appendChild(paperIcon);
    button.appendChild(text);
    button.appendChild(arrowIcon);

    return button;
  }

  /**
   * Create the process circle
   * @param {number} progress Progress.
   * @returns {HTMLDivElement} Progress circle.
   */
  createCircle(progress) {
    const color = Colors.computeContrastColor(Colors.colorBase, Colors.DEFAULT_COLOR_BG);
    const circleProgress = document.createElement('div');
    circleProgress.classList.add('h5p-interactive-book-summary-progress-circle');
    circleProgress.setAttribute('data-value', progress);
    circleProgress.setAttribute('data-start-angle', -Math.PI / 3);
    circleProgress.setAttribute('data-thickness', 13);
    circleProgress.setAttribute('data-empty-fill', `rgba(${color.rgb().array().join(', ')}, .1)`);
    circleProgress.setAttribute('data-fill', JSON.stringify({ color: color.hex() }));

    return circleProgress;
  }

  /**
   * Create a progress box used at the top of the summary
   * @param {string} title Title.
   * @param {string} smallText Sub text.
   * @param {number} progressCounter Current progress.
   * @param {number} progressTotal Total progress.
   * @param {boolean} [isAbsoluteValues] Use absolute values for progress instead of percentage
   * @param {number} [smallProgress] Progress for small text if it differs from the progress counter
   * @param {number} [smallProgressTotal] Total progress for small text if it differs from the total progress counter
   * @returns {HTMLDivElement} Progress element.
   */
  createProgress(title, smallText, progressCounter, progressTotal, isAbsoluteValues = false, smallProgress, smallProgressTotal) {
    const box = document.createElement('div');

    const header = document.createElement('h3');
    header.innerHTML = title;

    const progressPercentage = progressCounter * 100 / progressTotal;
    if (smallProgress === undefined) {
      smallProgress = progressCounter;
    }

    if (smallProgressTotal === undefined) {
      smallProgressTotal = progressTotal;
    }

    const progressBigText = document.createElement('p');
    progressBigText.classList.add('h5p-interactive-book-summary-progressbox-bigtext');
    progressBigText.innerHTML = Math.round(progressPercentage) + '%';
    if (isAbsoluteValues) {
      const progress = document.createElement('span');
      progress.classList.add('absolute-value');
      progress.innerHTML = progressCounter;

      const separator = document.createElement('span');
      separator.classList.add('separator');
      separator.innerHTML = '/';

      const total = document.createElement('span');
      total.classList.add('absolute-value');
      total.innerHTML = progressTotal;

      progressBigText.innerHTML = '';
      progressBigText.appendChild(progress);
      progressBigText.appendChild(separator);
      progressBigText.appendChild(total);
    }

    const progressSmallText = document.createElement('span');
    progressSmallText.classList.add('h5p-interactive-book-summary-progressbox-smalltext');
    progressSmallText.innerHTML = smallText.replace('@count', smallProgress).replace('@total', smallProgressTotal);

    box.appendChild(header);
    box.appendChild(progressBigText);
    box.appendChild(progressSmallText);

    const container = document.createElement('div');
    container.appendChild(box);
    container.appendChild(this.createCircle(progressCounter / progressTotal));

    return container;
  }

  /**
   * Create total score progress container
   * @returns {HTMLDivElement} Score container.
   */
  addScoreProgress() {
    let totalInteractions = 0, uncompletedInteractions = 0;
    for (const chapter of this.chapters) {
      totalInteractions += chapter.maxTasks;
      uncompletedInteractions += chapter.tasksLeft;
    }

    const box = this.createProgress(
      this.l10n.totalScoreLabel,
      this.l10n.interactionsProgressSubtext,
      this.parent.getScore(),
      this.parent.getMaxScore(),
      true,
      Math.max(totalInteractions - uncompletedInteractions, 0),
      totalInteractions
    );
    box.classList.add('h5p-interactive-book-summary-progress-container');
    box.classList.add('h5p-interactive-book-summary-score-progress');
    const circle = box.querySelector('.h5p-interactive-book-summary-progress-circle');
    circle.setAttribute('data-empty-fill', 'rgb(198, 220, 212)');
    circle.setAttribute('data-fill', JSON.stringify({ color: '#0e7c57' }));

    if (!this.behaviour.showTotalScore) {
      box.classList.add('display-none');
    }

    return box;
  }

  /**
   * Creates the book progress container
   * @returns {HTMLDivElement} Progress box.
   */
  addBookProgress() {
    const box = this.createProgress(this.l10n.bookProgress, this.l10n.bookProgressSubtext, this.chapters.filter((chapter) => chapter.completed).length, this.chapters.length);
    box.classList.add('h5p-interactive-book-summary-progress-container');
    box.classList.add('h5p-interactive-book-summary-book-progress');

    if (!this.behaviour.showArticleProgress) {
      box.classList.add('display-none');
    }

    return box;
  }

  /**
   * Creates the interactions progress container
   * @returns {HTMLDivElement} Progress box.
   */
  addInteractionsProgress() {
    let totalInteractions = 0, uncompletedInteractions = 0;
    for (const chapter of this.chapters) {
      totalInteractions += chapter.maxTasks;
      uncompletedInteractions += chapter.tasksLeft;
    }
    const box = this.createProgress(this.l10n.interactionsProgress, this.l10n.interactionsProgressSubtext, Math.max(totalInteractions - uncompletedInteractions, 0), totalInteractions);
    box.classList.add('h5p-interactive-book-summary-progress-container');
    box.classList.add('h5p-interactive-book-summary-interactions-progress');

    if (!this.behaviour.showInteractionProgress) {
      box.classList.add('display-none');
    }

    return box;
  }

  /**
   * Grouping function that creates all the progress containers, if the settings allow it
   */
  addProgressIndicators() {
    if (!this.behaviour.progressIndicators) {
      return;
    }
    const progressBox = document.createElement('div');
    progressBox.classList.add('h5p-interactive-box-summary-progress');
    progressBox.appendChild(this.addScoreProgress());
    progressBox.appendChild(this.addBookProgress());
    progressBox.appendChild(this.addInteractionsProgress());

    setTimeout(() => H5P.jQuery('.h5p-interactive-book-summary-progress-circle').circleProgress(), 100);
    this.wrapper.appendChild(progressBox);
  }

  /**
   * Add the container with the action buttons
   */
  addActionButtons() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-summary-buttons');

    if (
      this.behaviour.showTotalScore ||
      this.behaviour.showArticleProgress ||
      this.behaviour.showInteractionProgress
    ) {
      wrapper.classList.add('extra-margin-top');
    }

    this.checkTheAnswerIsUpdated();

    if (this.parent.isSubmitButtonEnabled && this.parent.isAnswerUpdated) {
      const submitButton = this.addButton('icon-paper-pencil', this.l10n.submitReport);
      submitButton.classList.add('h5p-interactive-book-summary-submit');
      submitButton.onclick = () => {
        this.trigger('submitted');
        this.parent.triggerXAPIScored(this.parent.getScore(), this.parent.getMaxScore(), 'completed');
        wrapper.classList.add('submitted');
        const submitText = wrapper.querySelector('.answers-submitted');
        submitText.focus();
        this.tempState = JSON.stringify(this.getChapterStats());
        this.parent.isAnswerUpdated = false;
      };
      wrapper.appendChild(submitButton);
    }
    wrapper.appendChild(this.createRestartButton());
    wrapper.appendChild(this.createSubmittedConfirmation());

    this.wrapper.appendChild(wrapper);
  }

  /**
   * Create the restart button
   * @returns {HTMLButtonElement} Button.
   */
  createRestartButton() {
    const restartButton = this.addButton('icon-restart', this.l10n.restartLabel);
    restartButton.classList.add('h5p-interactive-book-summary-restart');
    restartButton.onclick = () => this.parent.resetTask();
    return restartButton;
  }

  /**
   * Create the confirmation box displayed after the user submits the report
   * @returns {HTMLDivElement} Confirmation.
   */
  createSubmittedConfirmation() {
    const submittedContainer = document.createElement('div');
    submittedContainer.classList.add('h5p-interactive-book-summary-submitted');

    const icon = document.createElement('span');
    icon.classList.add('icon-chapter-done');
    icon.classList.add('icon-check-mark');
    submittedContainer.appendChild(icon);

    const text = document.createElement('p');
    text.innerHTML = this.l10n.yourAnswersAreSubmittedForReview;
    text.tabIndex = -1;
    text.classList.add('answers-submitted');
    submittedContainer.appendChild(text);

    submittedContainer.appendChild(this.createRestartButton());

    return submittedContainer;
  }

  /**
   * Function to create the actual button element used for the action buttons
   * @param {string} iconClass Class name for icon.
   * @param {string} label Label.
   * @returns {HTMLButtonElement} Button.
   */
  addButton(iconClass, label) {
    const buttonElement = document.createElement('button');
    buttonElement.type = 'button';
    buttonElement.classList.add('h5p-interactive-book-summary-button');
    buttonElement.innerHTML = label;

    const icon = document.createElement('span');
    icon.classList.add(iconClass);
    icon.setAttribute('aria-hidden', 'true');
    buttonElement.appendChild(icon);

    return buttonElement;
  }

  /**
   * Create the overview of the sections
   * @param {object[]} sections Sections.
   * @param {string} chapterId Chapter id.
   * @returns {object} {hasUnansweredInteractions: boolean, sectionElements: []}.
   */
  createSectionList(sections, chapterId) {
    let sectionElements = [], hasUnansweredInteractions = false;
    let responseFields = [], titles = [];
    for (const section of sections) {
      const sectionRow = document.createElement('li');
      sectionRow.classList.add('h5p-interactive-book-summary-overview-section-details');
      const sectionRowContainer = document.createElement('div');
      sectionRowContainer.classList.add('h5p-interactive-book-summary-overview-section-container');
      sectionRow.appendChild(sectionRowContainer);

      const isActiveReaderToggleEnabled =
        (
          ['H5P.ActiveReaderTextInput', 'H5P.KeywordSelector']
            .includes(section.instance.libraryInfo.machineName) &&
              section.instance.getResponse().trim()
        );

      if (this.behaviour.progressIndicators) {
        const icon = document.createElement('span');
        icon.classList.add('h5p-interactive-book-summary-section-icon');
        icon.classList.add(section.taskDone ? 'icon-chapter-done' : 'icon-chapter-blank');
        sectionRowContainer.appendChild(icon);
      }

      titles[section.instance.subContentId] = document.createElement('button');
      titles[section.instance.subContentId].type = 'button';
      titles[section.instance.subContentId].classList.add(
        'h5p-interactive-book-summary-section-title'
      );
      // Add class if isActiveReaderToggleEnabled
      isActiveReaderToggleEnabled &&
        titles[section.instance.subContentId].classList.add('toggle', 'hidden');

      titles[section.instance.subContentId].onclick = () => {
        if (isActiveReaderToggleEnabled) {
          // toggle hidden class on the chapter
          responseFields[section.instance.subContentId].classList.toggle(
            'hidden'
          );
          titles[section.instance.subContentId].classList.toggle('hidden');
          return;
        }

        const newChapter = {
          h5pbookid: this.parent.contentId,
          chapter: `h5p-interactive-book-chapter-${chapterId}`,
          section: `h5p-interactive-book-section-${section.instance.subContentId}`,
        };
        this.parent.trigger('newChapter', newChapter);
      };

      // We can't expect the content type to always have set contentData as a property on their instance
      const contentDataTitle = section.instance.contentData
        && section.instance.contentData.metadata
        && section.instance.contentData.metadata.title;
      // Try to get title from params
      const metadataTitle = section.content
        && section.content.metadata
        && section.content.metadata.title;
      titles[section.instance.subContentId].innerHTML = contentDataTitle
        ? contentDataTitle : metadataTitle ? metadataTitle : 'Untitled';

      const score = document.createElement('div');
      score.classList.add('h5p-interactive-book-summary-section-score');
      score.innerHTML = '-';
      if ( typeof section.instance.getScore === 'function') {
        score.innerHTML = this.l10n.scoreText.replace('@score', section.instance.getScore()).replace('@maxscore', section.instance.getMaxScore());
      }

      if ( section.taskDone) {
        sectionRow.classList.add('h5p-interactive-book-summary-overview-section-details-task-done');
      }
      else {
        hasUnansweredInteractions = true;
      }

      // Add active reader text's content
      if (isActiveReaderToggleEnabled) {
        responseFields[section.instance.subContentId] =
          document.createElement('div');
        responseFields[section.instance.subContentId].classList.add(
          'h5p-interactive-book-summary-text-toggle',
          `h5p-content-chapter-${section.instance.subContentId}`,
          'hidden'
        );
        responseFields[section.instance.subContentId].innerHTML =
          section.instance.getResponse();
        sectionRow.appendChild(responseFields[section.instance.subContentId]);
      }

      sectionRowContainer.appendChild(titles[section.instance.subContentId]);
      sectionRowContainer.appendChild(score);
      sectionElements.push(sectionRow);
    }
    if ( sectionElements.length) {
      const sectionRow = document.createElement('div');
      sectionRow.classList.add('h5p-interactive-book-summary-overview-section-score-header');
      const scoreHeader = document.createElement('div');
      scoreHeader.innerHTML = this.l10n.score;
      sectionRow.appendChild(scoreHeader);
      sectionElements.unshift(sectionRow);
    }
    return {
      hasUnansweredInteractions,
      sectionElements
    };
  }

  /**
   * Create the chapter progress container
   * @param {object} chapter Chapter.
   * @returns {HTMLLIElement} List item element.
   */
  createChapterOverview(chapter) {
    const wrapper = document.createElement('li');
    wrapper.classList.add('h5p-interactive-book-summary-overview-section');
    const header = document.createElement('h4');
    header.onclick = () => {
      const newChapter = {
        h5pbookid: this.parent.contentId,
        chapter: `h5p-interactive-book-chapter-${chapter.instance.subContentId}`,
        section: 'top',
      };
      this.parent.trigger('newChapter', newChapter);

    };

    const chapterTitle = document.createElement('span');
    chapterTitle.innerHTML = chapter.title;
    header.appendChild(chapterTitle);

    if (this.behaviour.progressIndicators) {
      const chapterIcon = document.createElement('span');
      const chapterStatus = this.parent.getChapterStatus(chapter);
      chapterIcon.classList.add(`icon-chapter-${chapterStatus.toLowerCase()}`);
      header.appendChild(chapterIcon);
    }

    wrapper.appendChild(header);

    let {
      sectionElements: sections,
      hasUnansweredInteractions
    } = this.createSectionList(chapter.sections.filter((section) => section.isTask), chapter.instance.subContentId);

    if ( hasUnansweredInteractions === false) {
      wrapper.classList.add('h5p-interactive-book-summary-no-interactions');
    }
    const sectionSubheader = document.createElement('div');
    sectionSubheader.classList.add('h5p-interactive-book-summary-chapter-subheader');
    if ( chapter.maxTasks ) {
      sectionSubheader.innerHTML = this.l10n.leftOutOfTotalCompleted.replace('@left', Math.max(chapter.maxTasks - chapter.tasksLeft, 0)).replace('@max', chapter.maxTasks);
    }
    else {
      sectionSubheader.innerHTML = this.l10n.noInteractions;
    }

    wrapper.appendChild(sectionSubheader);

    const sectionsContainer = document.createElement('ul');
    if ( sections.length ) {
      sections.map((section) => sectionsContainer.appendChild(section));
    }
    wrapper.appendChild(sectionsContainer);

    return wrapper;
  }

  createToggleAllDetails() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-summary-toggle-all-details-wrapper');

    const button = document.createElement('button');
    button.classList.add('h5p-interactive-book-summary-toggle-all-details-button');
    button.type = 'button';
    button.textContent = this.l10n.showDetails;
    button.addEventListener('click', (event) => {
      const sectionTitles = this.wrapper.querySelectorAll(
        '.h5p-interactive-book-summary-section-title.toggle'
      );

      this.isShowingDetails = !this.isShowingDetails;
      if (this.isShowingDetails) {
        button.textContent = this.l10n.hideDetails;

        sectionTitles.forEach((title) => {
          if (title.classList.contains('hidden')) {
            title.click();
          }
        });
      }
      else {
        button.textContent = this.l10n.showDetails;

        sectionTitles.forEach((title) => {
          if (!title.classList.contains('hidden')) {
            title.click();
          }
        });
      }
    });

    wrapper.append(button);

    return wrapper;
  }

  /**
   * Create the dropdown menu to filter sections by interactions
   * @returns {HTMLDivElement} Filter dropdown.
   */
  createFilterDropdown() {
    const container = document.createElement('div');
    container.classList.add('h5p-interactive-book-summary-dropdown');

    const selectButton = document.createElement('button');
    selectButton.setAttribute('aria-haspopup', 'true');
    selectButton.setAttribute('aria-expanded', 'false');
    selectButton.type = 'button';
    selectButton.onclick = () => {
      if (container.hasAttribute('active')) {
        container.removeAttribute('active');
        selectButton.setAttribute('aria-expanded', 'false');
      }
      else {
        container.setAttribute('active', '');
        selectButton.setAttribute('aria-expanded', 'true');
        selectButton.focus();
      }
    };

    const buttonText = document.createElement('span');
    buttonText.textContent = this.l10n.allInteractions;
    selectButton.appendChild(buttonText);

    const createElement = (text, value)  => {
      const listElement = document.createElement('li');
      listElement.role = 'menuitem';

      const actionButton = document.createElement('button');
      actionButton.textContent = text;
      actionButton.type = 'button';
      actionButton.onclick = (event) => {
        this.setFilter(value);
        container.removeAttribute('active');
        selectButton.setAttribute('aria-expanded', 'false');
        buttonText.textContent = event.currentTarget.innerHTML;
      };
      listElement.appendChild(actionButton);
      return listElement;
    };

    const caretIcon = document.createElement('span');
    caretIcon.classList.add('h5p-interactive-book-summary-dropdown-icon');
    caretIcon.classList.add('icon-expanded');
    caretIcon.setAttribute('aria-hidden', 'true');
    selectButton.appendChild(caretIcon);

    const dropdownMenu = document.createElement('ul');
    dropdownMenu.role = 'menu';
    dropdownMenu.classList.add('h5p-interactive-book-summary-dropdown-menu');

    const allInteractions = createElement(this.l10n.allInteractions, this.filterActionAll);
    const unansweredInteractions = createElement(this.l10n.unansweredInteractions, this.filterActionUnanswered);
    dropdownMenu.appendChild(allInteractions);
    dropdownMenu.appendChild(unansweredInteractions);

    container.appendChild(selectButton);
    container.appendChild(dropdownMenu);

    return container;
  }

  /**
   * Add the container for the list of chapters and sections
   */
  addSummaryOverview() {
    const wrapper = document.createElement('ul');
    wrapper.classList.add('h5p-interactive-book-summary-list');
    const summaryHeader = document.createElement('li');
    summaryHeader.classList.add('h5p-interactive-book-summary-overview-header');

    const header = document.createElement('div');
    header.classList.add('h3');
    header.innerHTML = this.l10n.summaryHeader;

    summaryHeader.appendChild(header);
    summaryHeader.appendChild(this.createToggleAllDetails());
    summaryHeader.appendChild(this.createFilterDropdown());

    wrapper.appendChild(summaryHeader);

    const summaryList = document.createElement('ol');
    summaryList.classList.add('h5p-interactive-book-summary-overview-list');
    for ( const chapter of this.chapters) {
      summaryList.appendChild(this.createChapterOverview(chapter));
    }
    const emptySummaryList = document.createElement('p');
    emptySummaryList.classList.add('h5p-interactive-book-summary-overview-list-empty');
    emptySummaryList.classList.add('h5p-interactive-book-summary-top-section');
    emptySummaryList.classList.add('h5p-interactive-book-summary-bottom-section');
    emptySummaryList.innerHTML = this.l10n.noInteractions;
    summaryList.appendChild(emptySummaryList);
    wrapper.appendChild(summaryList);

    // Resize the page when user toggle the text response item
    summaryList.addEventListener('transitionend', () => {
      this.parent.trigger('resize');
    });

    this.wrapper.appendChild(wrapper);
  }

  /**
   * Add the score bar for the book
   */
  addScoreBar() {
    const scorebar = document.createElement('div');
    scorebar.classList.add('h5p-interactive-book-summary-score-bar');

    const scoreBar = H5P.JoubelUI.createScoreBar(this.parent.getMaxScore());
    scoreBar.setScore(this.parent.getScore());
    scoreBar.appendTo(scorebar);
    this.wrapper.appendChild(scorebar);
  }

  /**
   * Add a container to display when no interactions are made in the book
   */
  noChapterInteractions() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-summary-no-chapter-interactions');
    const boldText = document.createElement('p');
    boldText.innerHTML = this.l10n.noChapterInteractionBoldText;

    const normalText = document.createElement('p');
    normalText.classList.add('h5p-interactive-book-summary-no-initialized-chapters');
    normalText.innerHTML = this.l10n.noChapterInteractionText;

    wrapper.appendChild(boldText);
    wrapper.appendChild(normalText);

    this.wrapper.appendChild(wrapper);
  }

  /**
   * Add the summary page to a container
   * @param {H5P.jQuery} container Container element.
   * @returns {H5P.jQuery} Container element with summary page.
   */
  addSummaryPage(container) {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('h5p-interactive-book-summary-page');

    if (
      this.chapters.filter((chapter) => chapter.isInitialized).length > 0 ||
      this.chapters.some((chapter) => {
        return chapter.sections.some((section) => section.taskDone);
      })
    ) {
      // Only initilize if it's actually going to be shown
      if (
        this.parent.pageContent && this.parent.chapters[this.parent.getChapterId(this.parent.pageContent.targetPage.chapter)].isSummary ||
        this.parent.chapters.length === 0
      ) {
        // Initialize all the things!
        if (this.parent.chapters.length > 0) {
          // Initializing from previous state, pageContent not set yet
          for (const chapterId in this.chapters) {
            this.parent.pageContent.initializeChapter(chapterId);
          }
        }
        this.addProgressIndicators();
        this.addActionButtons();
        this.addSummaryOverview();
        this.addScoreBar();
      }
    }
    else {
      this.noChapterInteractions();
    }

    Array.from(document.querySelectorAll('.h5p-interactive-book-summary-footer')).forEach((element) => element.remove());

    container.append(this.wrapper);

    return container;
  }

  /**
   * Verify that submit button should be enabled
   * Compare previous and current states of children to notice changes
   */
  checkTheAnswerIsUpdated() {
    const chapters = this.getChapterStats();
    const previousState = JSON.parse(this.tempState);

    for (const index of chapters.keys()) {
      if (
        !previousState[index].state || !chapters[index].state
      ) {
        continue;
      }

      let previousStateInstance = previousState[index].state.instances;
      let currentStateInstance = chapters[index].state.instances;
      let currentTaskDone = chapters[index].sections;
      for (const internalIndex of previousStateInstance.keys()) {
        // Skip null and undefined
        if (previousStateInstance[internalIndex] === null || previousStateInstance[internalIndex] === undefined) {
          continue;
        }

        // Compare array type data
        if (Array.isArray(previousStateInstance[internalIndex]) &&
          !this.compareStates(previousStateInstance[internalIndex], currentStateInstance[internalIndex]) &&
          currentTaskDone[internalIndex].taskDone) {
          this.parent.isAnswerUpdated = true;
        }
        // Compare object type data
        if (typeof (previousStateInstance[internalIndex]) === 'object' &&
          !Array.isArray(previousStateInstance[internalIndex]) &&
          JSON.stringify(previousStateInstance[internalIndex]) !== JSON.stringify(currentStateInstance[internalIndex]) &&
          currentTaskDone[internalIndex].taskDone) {
          this.parent.isAnswerUpdated = true;
        }
      }

      // Break the entire loop even if one content type has updated value
      if (this.parent.isAnswerUpdated) {
        break;
      }
    }
  }

  /**
   * Get current state of children
   * @returns {object} of chapters with sections and state
   */
  getChapterStats() {
    return this.chapters
      .filter((chapter) => !chapter.isSummary)
      .map((chapter) => ({
        sections: chapter.sections.map((section) => ({ taskDone: section.taskDone })),
        state: chapter.instance.getCurrentState()
      }));
  }

  /**
   * Add the summary page to a container
   * @param {object[]} previousstate Previous state.
   * @param {object[]} currentState Current state.
   * @returns {boolean} True, if states are equal.
   */
  compareStates(previousstate, currentState) {
    return Array.isArray(previousstate) &&
        Array.isArray(currentState) &&
        previousstate.length === currentState.length &&
        previousstate.every((val, index) => val === currentState[index] || currentState[index] === '');
  }
}

export default Summary;
